---
sidebar_position: 4
title: "Chapter 4: Idempotency Design Patterns"
description: "Learn how to ensure consistent data processing through idempotency patterns including Fast Metadata Cleaner, Data Overwrite, Merger, and Transactional Writer approaches."
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';

# Chapter 4: Idempotency Design Patterns

> **"Idempotency is the insurance policy your data pipeline needs. Process once or process a thousand times—the result should always be the same."**
>
> — Data Engineering Wisdom

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overwriting](#2-overwriting)
   - 2.1. [Pattern: Fast Metadata Cleaner](#21-pattern-fast-metadata-cleaner)
   - 2.2. [Pattern: Data Overwrite](#22-pattern-data-overwrite)
3. [Updates](#3-updates)
   - 3.1. [Pattern: Merger](#31-pattern-merger)
   - 3.2. [Pattern: Stateful Merger](#32-pattern-stateful-merger)
4. [Database](#4-database)
   - 4.1. [Pattern: Keyed Idempotency](#41-pattern-keyed-idempotency)
   - 4.2. [Pattern: Transactional Writer](#42-pattern-transactional-writer)
5. [Immutable Dataset](#5-immutable-dataset)
   - 5.1. [Pattern: Proxy](#51-pattern-proxy)
6. [Summary](#6-summary)

---

## 1. Introduction

**In plain English:** Idempotency means that running the same operation multiple times produces the same result, just like pressing an elevator button repeatedly—it still takes you to the same floor.

**In technical terms:** Idempotency in data engineering ensures that no matter how many times you run a data processing job, you'll always get consistent output without duplicates or with clearly identifiable duplicates.

**Why it matters:** Error management patterns from Chapter 3 handle retries and recovery, but they can cause data duplication. Idempotency patterns prevent these duplicates, ensuring data consistency even when jobs retry or backfill.

Each data engineering activity eventually leads to errors—you already know that from the previous chapter. Correctly implemented error management design patterns address most issues, but not all. Why? Let's examine an example of automatic recovery from a temporary failure.

From the engineering standpoint, automatic retry is a great feature requiring only configuration of retry attempts. However, from the data perspective, this feature brings a serious challenge for consistency. A retried task might replay already successful write operations in the target data store, leading to duplication in the best-case scenario. Duplicates can be removed on the consumer's side. But imagine the contrary: the retried item generates duplicates that cannot be removed because you can't tell they represent the same data.

> **Insight**
>
> The best example of idempotency is the absolute value function. No matter how many times you invoke `absolute(-1)`, you always get the same result: `absolute(-1) == absolute(absolute(absolute(-1)))`. The same principle applies to data pipelines—multiple executions should yield identical results.

In this chapter, you'll discover various idempotency approaches in data engineering. You'll learn what to do if you can fully overwrite the dataset or when you only have its subset available. You'll also learn how to leverage databases to implement an idempotency strategy. Finally, you'll see a design pattern to keep the dataset immutable but idempotent.

A special mention goes to Maxime Beauchemin, who made idempotency popular in 2018 with his state-of-the-art article "Functional Data Engineering: A Modern Paradigm for Batch Data Processing."

---

## 2. Overwriting

The first idempotency family covers the data removal scenario. Removing existing data before writing new data is the easiest approach. However, running it on big datasets can be compute intensive. For that reason, you can use data- or metadata-based solutions to handle the removal.

### 2.1. Pattern: Fast Metadata Cleaner

Metadata operations are often the fastest since they don't need to interact with the data files. Instead, they operate on a much smaller layer that describes these data files. The metadata part operates on the logical level instead of the physical one. The Fast Metadata Cleaner pattern leverages metadata to enable fast data cleaning.

#### Problem

Your daily batch job processes between 500 GB and 1.5 TB of visits data events. To guarantee idempotency, you define two steps:
1. Remove all rows added to the table by the previous run with a DELETE operation
2. Insert processed rows with an INSERT operation

The workflow ran fine for three weeks, but then it started suffering from latency issues. The table has grown significantly and the DELETE task's performance has degraded considerably. You're looking for a more scalable and idempotent pipeline design for this continuously growing table and the daily batch job.

#### Solution

**In plain English:** Instead of treating your dataset as one big table, split it into multiple smaller tables (like weekly or daily tables) and use fast commands like TRUNCATE or DROP to clean them instantly.

**In technical terms:** The Fast Metadata Cleaner pattern relies on dataset partitioning where each partition is a separate physical table, exposed through a unified logical view. Metadata operations (TRUNCATE TABLE or DROP TABLE) clean partitions without scanning data.

**Why it matters:** DELETE operations on large tables can take hours, while TRUNCATE operations complete in seconds, regardless of data volume.

> **Insight**
>
> TRUNCATE TABLE semantically equals DELETE FROM without conditions—both remove all records. However, TRUNCATE doesn't perform a table scan, making it a metadata operation that's orders of magnitude faster on large datasets.

<DiagramContainer title="Fast Metadata Cleaner Architecture">
  <Column gap="lg">
    <Group title="Physical Storage (Weekly Tables)" color={colors.blue} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.blue} variant="outlined" size="sm">week_01</Box>
        <Box color={colors.blue} variant="outlined" size="sm">week_02</Box>
        <Box color={colors.blue} variant="outlined" size="sm">week_03</Box>
        <Box color={colors.blue} variant="outlined" size="sm">...</Box>
        <Box color={colors.blue} variant="outlined" size="sm">week_52</Box>
      </Row>
    </Group>
    <Arrow direction="down" label="exposed through" />
    <Box color={colors.green} variant="filled" size="lg" icon="👁️">
      Unified View (visits_yearly)
    </Box>
  </Column>
</DiagramContainer>

Instead of considering the dataset as a single monolithic unit, think about it as multiple physically divided datasets that together form a whole logical data unit. Store the dataset in multiple tables and expose it from a single place, like a view.

The pattern relies on dataset partitioning and data orchestration. You need to define the partitioning carefully since it directly impacts the idempotency granularity. For example, if the dataset is composed of 52 weekly tables, the idempotency granularity is one week. This granularity defines the units on which you can apply metadata operations to clean the table.

You must adapt the data orchestration to the idempotency granularity by adding these extra steps:

1. **Analyze the execution date** and decide whether the pipeline should start a new idempotency granularity or continue with the previous one
2. **Create the idempotency environment** using TRUNCATE TABLE or DROP TABLE operations
3. **Update the single abstraction** exposing the idempotency context tables (e.g., refresh a view)

<DiagramContainer title="Fast Metadata Cleaner Workflow">
  <ProcessFlow
    direction="horizontal"
    steps={[
      { title: "Check Date", description: "Is it Monday?", icon: "📅", color: colors.purple },
      { title: "TRUNCATE/DROP", description: "Clean weekly table", icon: "🗑️", color: colors.orange },
      { title: "Load Data", description: "Insert new records", icon: "💾", color: colors.blue },
      { title: "Update View", description: "Refresh unified view", icon: "🔄", color: colors.green }
    ]}
  />
</DiagramContainer>

For incremental and partitioned datasets, the workflow includes conditional branching. For full datasets, you can simplify the workflow and run the table's re-creation step at each load.

> **Warning**
>
> The idempotency granularity is also the backfilling granularity. If you partition data weekly and need to backfill one day, you must rerun the whole week. You cannot perform fine-grained backfills (e.g., for one data provider or customer) with this pattern.

#### Consequences

**Granularity and backfilling boundary:** The pattern defines an idempotency granularity that is also a backfilling boundary. If you replay the pipeline, you must do it from the task that creates a partitioned table. Otherwise, you'll end up with an inconsistent dataset. If you partition data weekly but need to backfill only one day, you must rerun the whole week.

**Metadata limits:** Be aware of data store limits. Modern data warehouses like GCP BigQuery and AWS Redshift have limits of 4,000 partitions and 200,000 tables, respectively. To overcome these limitations, you can add a freezing step to transform mutable idempotent tables into immutable ones, reducing the partition scope.

**Data exposition layer:** The dataset doesn't live in a single place anymore. End users may prefer to access data from a single point of entry. Use a database view or similar logical structure grouping multiple tables and exposing them as a single unit.

**Schema evolution:** If your idempotency tables get a new optional field, you'll need a separate pipeline to update the schema of existing tables. For new required fields, include them in the Fast Metadata Cleaner pattern because replaying past runs will automatically trigger processing.

**Database support:** The pattern works only on databases supporting metadata operations, including data warehouses, lakehouses, and relational databases. It may be difficult to implement on object stores.

#### Examples

The pattern heavily relies on a data orchestration layer. Here's an example with Apache Airflow coordinating a pipeline writing data to a PostgreSQL table.

```python
# Idempotency router with BranchPythonOperator
def retrieve_path_for_table_creation(**context):
    ex_date = context['execution_date']
    should_create_table = ex_date.day_of_week == 1 or ex_date.day_of_year == 1
    return 'create_weekly_table' if should_create_table else "dummy_task"

check_if_monday_or_first_january_at_midnight = BranchPythonOperator(
    task_id='check_if_monday_or_first_january_at_midnight',
    provide_context=True,
    python_callable=retrieve_path_for_table_creation
)
```

The key part is the `BranchPythonOperator` that verifies the execution date and, depending on the outcome, goes to data processing or follows the weekly table management.

```python
# Table management branch
create_weekly_table = PostgresOperator(
    # ...
    sql='/sql/create_weekly_table.sql'
)

recreate_view = PostgresViewManagerOperator(
    # ...
    view_name='visits',
    sql='/sql/recreate_view.sql'
)
```

The workflow creates a weekly table suffixed with the week number retrieved from Apache Airflow's execution context. The next task uses a custom operator that refreshes the visits view with the new weekly table.

---

### 2.2. Pattern: Data Overwrite

If using a metadata operation is not an option (for example, because you work on an object store that doesn't have TRUNCATE and DROP commands), you must apply a data operation. The Data Overwrite pattern provides an alternative solution.

#### Problem

One of your batch jobs runs daily on the visits dataset stored in event time-partitioned locations in an object store. The pipeline is still missing a proper idempotency strategy because each backfilling action generates duplicated records. You've heard about the Fast Metadata Cleaner pattern, but you can't use it because of the lack of a proper metadata layer. You're looking for an alternative solution.

#### Solution

**In plain English:** Instead of using special database commands, directly replace the old data files with new ones—like deleting an old file before saving a new version.

**In technical terms:** The Data Overwrite pattern relies on native dataset replacement commands at the data layer. The implementation depends on the technology and uses data processing framework options or SQL commands to physically replace data files.

**Why it matters:** When metadata operations aren't available, data overwriting provides idempotency through direct file replacement, though with higher computational cost.

The implementation depends on the technology:

**Data Processing Frameworks:** Apache Spark uses a save mode and Apache Flink uses write mode properties. Once you've configured your data writer, the framework handles cleaning existing files before writing. This can be extended to selective overwriting with conditions (e.g., Delta Lake's `replaceWhere` option).

**SQL Approaches:**
1. **DELETE + INSERT:** Combine DELETE FROM and INSERT INTO operations
2. **INSERT OVERWRITE:** Overwrites the whole table with records from the INSERT part (more concise but doesn't support row selection)
3. **Data loading commands:** Some data stores like BigQuery support LOAD DATA OVERWRITE natively

<ComparisonTable
  beforeTitle="DELETE + INSERT"
  afterTitle="INSERT OVERWRITE"
  beforeColor={colors.orange}
  afterColor={colors.green}
  items={[
    { label: "Verbosity", before: "Two separate commands", after: "Single command" },
    { label: "Selective overwrite", before: "Supports WHERE clause", after: "Replaces entire table" },
    { label: "Readability", before: "More explicit", after: "More concise" }
  ]}
/>

> **Insight**
>
> The INSERT command doesn't need explicitly defined values. You can insert records from another table: `INSERT INTO visits (id, v_time) SELECT visit_id, visit_time FROM visits_raw` adds all visits from visits_raw without declaring them explicitly.

> **Warning**
>
> Running the overwriting command doesn't guarantee your data will disappear immediately. Data stores supporting time travel (table file formats, GCP BigQuery, Snowflake) still keep data blocks after overwrite. They're only deleted after the configured retention period or after running a vacuum operation.

#### Consequences

**Data overhead:** Since there's a data operation involved, the pattern can perform poorly if the overwritten dataset is big and not partitioned. The overwrite becomes slower over time as more data accumulates. Mitigate this overhead by applying storage optimizations like partitioning.

**Vacuum need:** A DELETE operation might not remove data immediately from disk. This happens with table file formats and relational databases, where deleted data blocks still exist on disk (though not accessible via SELECT queries). Run a vacuum process to reclaim the space occupied by these dead rows.

#### Examples

Many modern data engineering solutions provide native implementation with INSERT OVERWRITE:

```sql
-- INSERT OVERWRITE example
INSERT OVERWRITE INTO devices
SELECT * FROM devices_staging
WHERE state = 'valid';
```

The command truncates the content of the table or partition(s) before inserting new data. This implementation is flexible—you can extend the simple SELECT statement to complex expressions involving joins or aggregations.

BigQuery supports a `writeDisposition` in the jobs feature:

```bash
# Loading data with prior table truncation in BigQuery
bq load dedp.devices gs://devices/in_20240101.csv ./info_schema.json --replace=true
```

The load job ingests devices data from the CSV file and sets the `--replace=true` flag to remove all existing data before writing. This is a shortcut for the WRITE_TRUNCATE disposition.

Apache Spark implements the pattern with a save mode option:

```python
# Overwriting data in PySpark
input_data.write.mode('overwrite').text(job_arguments.output_dir)
```

The overwrite mode drops all existing data before writing. Although simple, the save mode by itself is not transactional—everything depends on the target data format. Modern table file formats address this issue because the delete is a new commit in the log and data files remain untouched.

---

## 3. Updates

Removing a complete dataset to guarantee idempotency is easy. Unfortunately, some datasets are not good candidates for full replacement. This is the case with updated incremental datasets, where each new version contains only a subset of modified or updated data. An easier approach exists for these scenarios.

### 3.1. Pattern: Merger

If your dataset identity is static (no risk of modifying row identities), and your dataset only supports updates or inserts, the best approach is to merge changes with the existing dataset.

#### Problem

You're writing a pipeline to manage a stream of changes synchronized from your Apache Kafka topic via Change Data Capture. Your new batch pipeline must replicate all changes to the existing dataset stored as a Delta Lake table. The table must fully reflect the data present at a given moment in the data source, so it cannot contain duplicates.

#### Solution

**In plain English:** Instead of replacing the entire dataset, intelligently combine new changes with existing data—like updating your phone's contact list where new contacts are added and changed contacts are updated.

**In technical terms:** The Merger pattern uses MERGE (UPSERT) operations to combine incremental changes with existing datasets based on unique identifiers. It handles inserts, updates, and soft deletes in a single operation.

**Why it matters:** When you don't have the complete dataset available—only incremental changes—you need to combine new data with existing data while maintaining consistency.

<DiagramContainer title="Merger Pattern Operation">
  <ProcessFlow
    direction="vertical"
    steps={[
      { title: "Define Keys", description: "Identify unique attributes", icon: "🔑", color: colors.blue },
      { title: "Match Records", description: "Compare new vs existing", icon: "🔍", color: colors.purple },
      { title: "Insert/Update/Delete", description: "Apply appropriate action", icon: "⚡", color: colors.green }
    ]}
  />
</DiagramContainer>

> **Insight**
>
> Overwriting patterns (DELETE + INSERT) are simpler for fully available datasets. The Merger pattern requires interacting with data to combine new and existing rows, making it necessary only for incremental datasets that can't be easily managed with delete-and-replace.

The most important part of implementation is defining the attributes for combining datasets. Use a single property (like user ID) if it guarantees uniqueness. If not, use multiple attributes (like visit ID and visit time).

The MERGE command handles three scenarios:

**Insert:** The entry from the new dataset doesn't exist in your current dataset. It's a new record to add.

**Update:** Both datasets store a given record, but the new dataset provides an updated version.

**Delete:** This is the trickiest case. The Merger pattern doesn't support hard deletes. If a record is missing from the dataset you want to merge, nothing happens. Deletes are only possible as soft deletes (updates with an attribute marking a record as removed).

<CardGrid
  columns={3}
  cards={[
    {
      title: "Insert",
      icon: "➕",
      color: colors.green,
      items: [
        "New record",
        "Not in current dataset",
        "Add to table"
      ]
    },
    {
      title: "Update",
      icon: "🔄",
      color: colors.blue,
      items: [
        "Existing record",
        "Modified data",
        "Update attributes"
      ]
    },
    {
      title: "Delete",
      icon: "🗑️",
      color: colors.red,
      items: [
        "Soft delete only",
        "Mark as removed",
        "Keep in table"
      ]
    }
  ]}
/>

```sql
-- Implementation of soft deletes for the Merger pattern
MERGE INTO dedp.devices_output AS target
USING dedp.devices_input AS input
ON target.type = input.type AND target.version = input.version
WHEN MATCHED AND input.is_deleted = true THEN
    DELETE
WHEN MATCHED AND input.is_deleted = false THEN
    UPDATE SET full_name = input.full_name
WHEN NOT MATCHED AND input.is_deleted = false THEN
    INSERT (full_name, version, type)
    VALUES (input.full_name, input.version, input.type)
```

You might be surprised to see the `is_deleted` flag used for the INSERT statement. However, it's important because without it, you could insert removed records during the first execution of the Merger pattern and never get rid of them.

<DiagramContainer title="Impact of is_deleted Flag on First Run">
  <ComparisonTable
    beforeTitle="Without is_deleted check"
    afterTitle="With is_deleted check"
    beforeColor={colors.red}
    afterColor={colors.green}
    items={[
      { label: "Deleted records", before: "Inserted on first run", after: "Never inserted" },
      { label: "Data consistency", before: "Contains removed records", after: "Clean dataset" },
      { label: "Future cleanup", before: "Records stuck forever", after: "No cleanup needed" }
    ]}
  />
</DiagramContainer>

#### Consequences

**Uniqueness:** This is the first and most important requirement. Your data provider must define immutable attributes you can use to safely identify each record. Otherwise, the merge logic won't work because instead of updating a row during backfilling, it might insert a new one, leading to inconsistent duplicates.

**I/O overhead:** Unlike the Fast Metadata Cleaner, Merger is a data-based pattern working directly at the data blocks level, making it more compute intensive. However, modern databases and table file formats optimize the reading part by searching for impacted records in the metadata layer first, helping skip processing irrelevant files.

**Incremental datasets with backfilling:** The Merger pattern has a shortcoming in the context of backfilling. Let's examine an example:

| Ingestion time | New rows | Output table rows |
|---------------|----------|-------------------|
| 07:00 | A | A |
| 08:00 | A-U, B | A-U, B |
| 09:00 | B-D, C | A-U, C |
| 10:00 | M, N, O | A-U, C, M, N, O |

The job correctly integrated updated and softly deleted rows. Now imagine you need to replay the pipeline from 08:00. Since the dataset is incremental, the backfill starts from the most recent version (A-U, C, M, N, O). Some rows are missing in the parts written after 08:00. During backfilling, your consumers won't see the same data as during the normal run:

| Ingestion time | New rows | Current rows | Output table rows |
|---------------|----------|--------------|-------------------|
| 08:00 | A-U, B | A-U, C, M, N, O | A-U, B, C, M, N, O |
| 09:00 | B-D, C | A-U, B, C, M, N, O | A-U, C, M, N, O |
| 10:00 | M, N, O | A-U, C, M, N, O | A-U, C, M, N, O |

To mitigate this issue, implement a restore mechanism outside the pipeline that rolls back the table to the first replayed execution. This is relatively easy if the database natively supports versioning via time travel (available in table file formats). Since it transforms the stateless Merger pattern into a stateful one, see the Stateful Merger pattern.

> **Insight**
>
> If your data provider introduces errors into the dataset, you don't need to replay your pipeline. Simply ask for a dataset with fixed errors so you can process it as a new dataset increment. The MERGE operation will apply correct values for invalid rows. This works as long as row identity doesn't change.

#### Examples

Let's see the pattern in action with Apache Airflow and a SQL query loading new devices. The query starts with loading operations:

```sql
-- The first part of the Merger pattern query
CREATE TEMPORARY TABLE changed_devices (LIKE dedp.devices);
COPY changed_devices FROM '/data_to_load/dataset.csv' CSV DELIMITER ';' HEADER;
```

This loads the new file into a temporary table that will be automatically destroyed at the end of the transaction. The LIKE operator avoids declaring all attributes of the target table, preventing potential metadata desynchronization.

Next comes the MERGE operation:

```sql
-- The second part of the Merger pattern query
MERGE INTO dedp.devices AS d USING changed_devices AS c_d
    ON c_d.type = d.type AND c_d.version = d.version
    WHEN MATCHED THEN
        UPDATE SET full_name = c_d.full_name
    WHEN NOT MATCHED THEN
        INSERT (type, full_name, version)
        VALUES (c_d.type, c_d.full_name, c_d.version)
```

The query manages new rows with the WHEN NOT MATCHED THEN section, followed by an INSERT statement. For updates, the WHEN MATCHED THEN branch applies changes. The query doesn't handle deletes because the input file is incremental (only new records or changed attributes for existing ones).

---

### 3.2. Pattern: Stateful Merger

The Merger pattern lacks consistency for datasets during backfillings. If consistency is important, the Stateful Merger pattern provides an alternative with data restoration capabilities.

#### Problem

You managed to synchronize changes between two Delta Lake tables with the Merger pattern. Unfortunately, one week later, you detected an issue in the merged dataset and your business users asked you to backfill. They want you to restore the dataset to the last valid version before triggering any backfilling. The Merger pattern isn't adapted for that, so you're looking for a way to extend it and support these demands in the future.

#### Solution

**In plain English:** Keep a logbook tracking which version of the dataset corresponds to each pipeline run, so you can restore to the correct version before backfilling.

**In technical terms:** The Stateful Merger pattern extends the Merger pattern with a state table that tracks dataset versions per execution time, enabling automatic restoration during backfilling scenarios.

**Why it matters:** Without state tracking, backfilling incremental datasets can create temporary inconsistencies visible to consumers. State tracking ensures consumers always see consistent data, even during backfills.

The Stateful Merger pattern involves an extra state table that changes the pipeline workflow. The workflow now has an additional step in the beginning to restore the merged table if needed and another at the end to update the state table.

<DiagramContainer title="Stateful Merger Workflow">
  <ProcessFlow
    direction="horizontal"
    steps={[
      { title: "Check Mode", description: "Normal or backfill?", icon: "🔍", color: colors.purple },
      { title: "Restore (if needed)", description: "Roll back to version", icon: "⏮️", color: colors.orange },
      { title: "Merge Data", description: "Apply changes", icon: "🔄", color: colors.blue },
      { title: "Update State", description: "Record new version", icon: "💾", color: colors.green }
    ]}
  />
</DiagramContainer>

Once the merge operation completes, it creates a new version of the merged table. The completion triggers another task that retrieves the created table version and associates it with the pipeline's execution time.

Example state table after running the pipeline at 09:00 and 10:00:

| Execution time | Table version |
|---------------|---------------|
| 08:00 | 4 |
| 09:00 | 5 |
| 10:00 | 6 |

The restoration step happens only when the pipeline runs in backfilling mode. The backfilling detection logic works as follows:

1. Get the version of the table created by the previous pipeline's run. If missing, it means you're running the pipeline for the first time or backfilling the first execution. In that case, clean the table with TRUNCATE TABLE and move to the merge operation.

2. Compare the current dataset version with the dataset version created by the previous pipeline's execution:
   - **Same versions:** Normal run scenario—no restoration needed
   - **Different versions:** Backfilling scenario—restore the table before applying the merge

Let's examine scenarios with this state table:

| Execution time | Version |
|---------------|---------|
| 2024-10-05 | 1 |
| 2024-10-06 | 2 |
| 2024-10-07 | 3 |
| 2024-10-08 | 4 |

**Scenario 1: Normal Run (2024-10-09)**
- Execution time is 2024-10-09
- Version created by previous run (2024-10-08) equals most recent version
- No restoration needed—move directly to merge operation

**Scenario 2: Backfill First Run (2024-10-05)**
- No version exists for 2024-10-04
- Restore task truncates the table before proceeding to merge

**Scenario 3: Backfill Middle Run (2024-10-07)**
- Version created by run from 2024-10-06 is different from most recent version
- Restore task rolls back table to version 2
- After pipeline completes, state table updates:

| Execution time | Version |
|---------------|---------|
| 2024-10-05 | 1 |
| 2024-10-06 | 2 |
| 2024-10-07 | 5 |
| 2024-10-08 | 4 |

After backfilling 2024-10-07, your data orchestrator backfills 2024-10-08. However, the most recent version equals the version created by the previous (already backfilled) run. The workflow falls back into the normal run scenario.

#### Consequences

**Versioned data stores:** The presented implementation requires your data store to be versioned (each write creates a new version). That's the only way you can track state and restore the table to a prior version.

If you don't work on a database with versioning capabilities, adapt the implementation. The pipeline loads all raw data into a dedicated raw data table with a column storing the execution time. The backfilling detection logic verifies whether the raw data table has records for future execution times:

```sql
-- Query verifying the pipeline's mode
SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END
FROM dedp.devices_history
WHERE execution_time > '{{ ts }}'
```

When the query returns true, the pipeline first removes all rows matching `WHERE execution_time >= '{{ ts }}'`. The raw data stores all rows corresponding to the last valid version. Next, rebuild the table by querying the devices_history table with the Windowed Deduplicator pattern. Finally, load input data for the current execution time to the devices_history table and merge with the restored main table.

<DiagramContainer title="Stateful Merger Without Versioning">
  <ProcessFlow
    direction="vertical"
    steps={[
      { title: "Check Future Data", description: "Query raw data table", icon: "🔍", color: colors.purple },
      { title: "Delete Future Rows", description: "Remove if backfilling", icon: "🗑️", color: colors.orange },
      { title: "Rebuild Table", description: "Query raw data history", icon: "🔨", color: colors.blue },
      { title: "Merge & Load", description: "Apply changes to history", icon: "💾", color: colors.green }
    ]}
  />
</DiagramContainer>

**Vacuum operations:** Versioned datasets (Delta Lake, Apache Iceberg tables) enable implementing the state table but hide a trap. After the configured retention duration, they remove files not used by the dataset. Some prior versions become unavailable at that moment. Mitigate the issue by increasing the retention period (though this increases storage costs) or accept that the pipeline cannot be backfilled beyond the retention period.

**Metadata operations:** Operations like compaction can run against your table. Compaction doesn't overwrite data but combines smaller files into bigger ones. Despite this no-data action, it also creates a new version of the table. If you always use the previous version from the state table in the restore action, you'll miss operations made between two merge runs.

To overcome this issue, change the logic to read the version corresponding to the current execution time and subtract 1:

```python
# Changed logic for retrieving the version to restore
version_to_restore = version_for_current_execution_time - 1
```

Example with compaction:

| Execution time | Version | Operation |
|---------------|---------|-----------|
| 2024-10-06 | 5 | Merge |
| 2024-10-07 | 6 | Compaction |
| | 7 | Compaction |
| | 8 | Compaction |
| | 9 | Merge (2024-10-07) |
| 2024-10-08 | 10 | Merge |

If you backfill the pipeline executed on 2024-10-07, the version for this execution time is 9, so the version to restore is 8. This corresponds to the compacted table between the runs of 2024-10-07 and 2024-10-08.

#### Examples

Let's implement the Stateful Merger pattern on top of Delta Lake orchestrated from Apache Airflow. First, the state table declaration:

```sql
-- State table definition
CREATE TABLE IF NOT EXISTS `default`.`versions`
(execution_time STRING NOT NULL, delta_table_version INT NOT NULL)
```

The table has two fields: one for the job's execution time and another for the corresponding Delta table version created.

Next comes the data restoration task implementing the logic from the Solution section:

```python
# Reading of current and past versions
last_merge_version = (spark.sql('DESCRIBE HISTORY default.devices')
     .filter('operation = "MERGE"')
     .selectExpr('MAX(version) AS last_version').collect()[0].last_version)

maybe_previous_job_version = spark.sql(f'''SELECT delta_table_version FROM versions
  WHERE execution_time = "{previous_execution_time}"''').collect()
```

The restoration task retrieves the last table version created by the MERGE operation alongside the table version written at the previous execution time.

Then evaluate the retrieved versions and trigger table truncation or table restoration:

```python
# Data restoration action
if not maybe_previous_job_version:
    spark.sql('TRUNCATE TABLE default.devices')
else:
    previous_job_version = maybe_previous_job_version[0].delta_table_version
    if previous_job_version < last_merge_version:
        current_run_version = (spark_session.sql(f'''SELECT delta_table_version FROM
         versions WHERE execution_time = "{currently_processed_version}"''')
         .collect()[0].delta_table_version)
        version_to_restore = current_run_version - 1
        (DeltaTable.forName(spark, 'devices').restoreToVersion(previous_job_version))
```

After eventually restoring the table, the pipeline executes the MERGE operation. The outcome creates a new commit version, which is retrieved in the next task and written to the state table:

```python
# State table update after successful MERGE
last_version = (spark.sql('DESCRIBE HISTORY default.devices')
   .selectExpr('MAX(version) AS last_version').collect()[0].last_version)
new_version_df = (spark.createDataFrame([
  Row(execution_time=current_execution_time, delta_table_version=last_version)]))

(DeltaTable.forName(spark_session, 'versions').alias('old_versions')
 .merge(new_version.alias('new_version'),
  'old_versions.execution_time = new_version.execution_time')
 .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())
```

There's a MERGE here too because in the case of backfilling, the writer updates the previous value, and in the case of the normal run, it inserts it.

---

## 4. Database

The previous patterns require extra work—adapting the orchestration layer or using well-thought-out writing operations. Sometimes you can take shortcuts and rely on databases to guarantee idempotency.

### 4.1. Pattern: Keyed Idempotency

The first pattern in this section uses key-based data stores and an idempotent key generation strategy. This mix results in writing data exactly once, no matter how many times you try to save a record.

#### Problem

Your streaming pipeline processes visit events to generate user sessions. The logic buffers all messages for a dedicated time window per user and writes an updated session to a key-value data store. As for other pipelines, you want to make sure this one is idempotent to avoid duplicates in case a task retries.

#### Solution

**In plain English:** Generate the same unique ID for the same data every time, like using your social security number—no matter how many forms you fill out, it's always the same number identifying you.

**In technical terms:** The Keyed Idempotency pattern applies to key-based databases where idempotency relies on key generation logic. Using immutable properties ensures generating the same key for the same data across multiple runs, causing overwrites instead of duplicates.

**Why it matters:** In key-based databases, if you write a record with the same key twice, the second write replaces the first. Generating stable keys ensures idempotency without complex merge logic.

<DiagramContainer title="Keyed Idempotency Concept">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.blue} variant="filled" size="md" icon="📝">Run 1</Box>
      <Arrow direction="down" />
      <Box color={colors.purple} variant="filled" size="md" icon="🔑">Key: user_123_time_456</Box>
    </Column>
    <Column gap="md" align="center">
      <Box color={colors.blue} variant="filled" size="md" icon="📝">Run 2 (retry)</Box>
      <Arrow direction="down" />
      <Box color={colors.purple} variant="filled" size="md" icon="🔑">Key: user_123_time_456</Box>
    </Column>
    <Arrow direction="right" />
    <Box color={colors.green} variant="filled" size="lg" icon="✅">
      Same Key = Same Record (Overwrite)
    </Box>
  </Row>
</DiagramContainer>

Start by finding immutable properties for key generation. Depending on your use case, your input dataset may already have unique attributes. For example, if you need the most recent activity for a user, simply use the user ID as the key.

However, the key may not always be available. Consider an example of user session activity from website visits. The input dataset contains only the user ID and visit time. You can't rely on user ID alone to create a session key because each new session would replace previous sessions. You could use the combination of user ID and first visit time to generate an idempotent key. Although valid, this hides a trap.

<DiagramContainer title="Late Data Impact on Key Generation">
  <Column gap="md">
    <Group title="Run 1: Normal Processing" color={colors.green} direction="column">
      <Row gap="sm">
        <Box color={colors.blue} size="sm">10:00</Box>
        <Box color={colors.blue} size="sm">10:05</Box>
        <Box color={colors.blue} size="sm">10:09</Box>
      </Row>
      <Box color={colors.green} variant="filled">Session Key: user_123_10:00</Box>
    </Group>
    <Arrow direction="down" label="Job crashes, restarts" />
    <Group title="Run 2: After Restart (Late Data Arrived)" color={colors.red} direction="column">
      <Row gap="sm">
        <Box color={colors.orange} size="sm">09:55</Box>
        <Box color={colors.blue} size="sm">10:00</Box>
        <Box color={colors.blue} size="sm">10:05</Box>
        <Box color={colors.blue} size="sm">10:09</Box>
      </Row>
      <Box color={colors.red} variant="filled">Session Key: user_123_09:55 (DIFFERENT!)</Box>
    </Group>
  </Column>
</DiagramContainer>

In the context of idempotent key generation for a user session, the event time attribute is mutable (the value may change between runs). For that reason, it's safer to use an immutable value like append time—the time a given entry was physically written to the streaming broker. Even if there are late events, the key won't be impacted and will remain the same.

> **Insight**
>
> Apache Kafka calls this property "append time." Other streaming brokers have the same attribute but different names. Amazon Kinesis Data Streams uses "approximate arrival timestamp." For data-at-rest stores, it's often called "added time," "ingestion time," or "insertion time," often implemented with a default value corresponding to the current time.

```sql
-- Window operation using ingestion time
SELECT ... OVER (
    PARTITION BY user_id
    ORDER BY ingestion_time ASC, visit_time ASC
)
```

The examples covered a key-based data store since it's the easiest to explain. However, the key generation strategy also works for data containers like files. For example, if you need to generate a new file from a daily batch job, name the file with the execution time. A job running on 20/11/2024 would write a file named `20_11_2024`, and a job running the next day would write `21_11_2024`. Replaying a pipeline always creates one file. The example applies to partitions or even tables. The requirement is using immutable attributes.

#### Consequences

**Database dependent:** Even though your job generates the same keys every time, it doesn't mean the pattern applies everywhere. It works well for databases with key-based support, such as NoSQL solutions (Apache Cassandra, ScyllaDB, HBase, etc.).

For other scenarios, the pattern is either not applicable or applicable with extra effort or trade-offs:

- **Relational databases:** If you try to insert a row with the same primary key, you'll get an error instead of overwriting. The writing operation becomes a MERGE instead of INSERT, adding extra complexity.

- **Apache Kafka:** It supports keys to uniquely identify each record, but as an append-only log, it doesn't deduplicate events at insertion time. Instead, it uses an asynchronous compaction mechanism that runs after writing the data. For some time, consumers can see duplicated entries (though they share the same keys, making them easier to distinguish).

**Mutable data source:** Compaction can be configured to remove events that are too old. If you restart the job and compaction deleted the first event used for key creation, you'll take the next record from the log and logically break the idempotency guarantee. On the other hand, since the data has changed, using a different key makes sense as the record's shape will be different.

#### Examples

Let's see the Keyed Idempotency pattern with an Apache Spark Structured Streaming job transforming Apache Kafka visit events into sessions and writing them to a ScyllaDB table.

```sql
-- ScyllaDB table for the sessions
CREATE TABLE sessions (
  session_id BIGINT,
  user_id BIGINT,
  pages LIST<TEXT>,
  ingestion_time TIMESTAMP,
  PRIMARY KEY(session_id, user_id)
);
```

The output table defines a unique key composed of `session_id` and `user_id` fields. They guarantee idempotent session generation based on the following data source definition.

```python
# Visits grouping with append time (timestamp column)
(input_data.selectExpr('CAST(value AS STRING)', 'timestamp').select(F.from_json(
  F.col('value'), 'user_id LONG, page STRING, event_time TIMESTAMP')
  .alias('visit'), F.col('timestamp'))
.selectExpr('visit.*', 'UNIX_TIMESTAMP(timestamp) AS append_time')
.withWatermark('event_time', '10 seconds').groupBy(F.col('user_id')))
```

The logic extracts the value and timestamp attributes from each Kafka record. The job builds the visit structure from the value's JSON and uses some attributes in the watermark definition. The timestamp column corresponds to the append time and is part of the key generation logic.

The idempotent key generation logic based on append time handles expired state:

```python
# Idempotent ID generation logic
def map_visit_to_session(user_tuple: Any,
   input_rows: Iterable[pandas.DataFrame],
   current_state: GroupState) -> Iterable[pandas.DataFrame]:
    session_expiration_time_50_seconds_as_ms = 50 * 1000
    user_id = user_tuple[0]

    if current_state.hasTimedOut:
        min_append_time, pages, = current_state.get
        session_to_return = {
            'user_id': [user_id],
            'session_id': [hash(str(min_append_time))],
            'pages': [pages]
        }
    else:
        # accumulation logic explained below
```

The output is a session identified by the user and session IDs from the accumulated state. The mapping function reads all records in each window and gets the earliest append time among them:

```python
# Append time accumulation in the state
else:
    data_min_append_time = 0
    for input_df_for_group in input_rows:
        data_min_append_time = int(input_df_for_group['append_time'].min()) * 1000
        if current_state.exists:
            min_append_time, current_pages, = current_state.get
            visited_pages = current_pages + pages
            current_state.update((min_append_time, visited_pages,))
        else:
            current_state.update((data_min_append_time, pages,))
```

It sets this value to the first version of the session state. Whenever there are other visits for the same entity, the logic follows the `if current_state.exists` branch. Since the append time in Apache Kafka is guaranteed to be increasing, we can simply take the same append time as the one computed in the first iteration.

The same solution can be implemented on top of other streaming brokers—the only difference is the attribute name. For Amazon Kinesis Data Streams, adapt the reading part:

```python
# Input part adapted to Amazon Kinesis Data Streams
(spark_session.readStream.format("kinesis")
 .load().selectExpr("CAST(data AS STRING)",
        "approximateArrivalTimestamp AS append_time"))
```

> **Warning**
>
> You can define the append time externally with an Apache Kafka producer. However, in the context of the pattern, it's riskier and less reliable than using the mechanism fully controlled by the broker. To see what strategy is set on your topic, verify the `log.message.timestamp.type` attribute.

---

### 4.2. Pattern: Transactional Writer

In addition to key uniqueness, transactions are another powerful database capability that can help implement idempotent data producers. Transactions provide all-or-nothing semantics, where changes are fully visible to consumers only when the writer confirms them.

#### Problem

One of your batch jobs leverages the unused compute capacity of your cloud provider to reduce total cost of ownership (TCO). Thanks to this special runtime environment, you've managed to save 60% on infrastructure costs. However, your downstream consumers start complaining about data quality.

Whenever the cloud provider takes a node off your cluster, all running tasks fail and retry on a different node. Because of this rescheduling, the tasks write the data again and your consumers see duplicates and incomplete records. You need to fix this issue and ensure that your job never exposes partial data.

#### Solution

**In plain English:** Use database transactions like a bank transfer—either all the money moves or none of it does. Consumers never see partial results.

**In technical terms:** The Transactional Writer pattern relies on native database transactional capacity so that in-progress but not committed changes remain invisible to downstream readers. Only committed transactions expose data to consumers.

**Why it matters:** In distributed systems where tasks can fail and retry, transactions prevent consumers from seeing incomplete or duplicate data by making writes atomic.

<DiagramContainer title="Transactional Writer Pattern">
  <ProcessFlow
    direction="horizontal"
    steps={[
      { title: "Begin Transaction", description: "Initialize write scope", icon: "🚪", color: colors.blue },
      { title: "Write Data", description: "Changes are private", icon: "✍️", color: colors.purple },
      { title: "Commit", description: "Make visible to all", icon: "✅", color: colors.green },
      { title: "OR Rollback", description: "Discard on failure", icon: "❌", color: colors.red }
    ]}
  />
</DiagramContainer>

The implementation consists of three main steps:

1. **Initialize the transaction:** Depending on your processing layer, this can be explicit (call START TRANSACTION or BEGIN) or implicit (your data processing layer handles transaction opening).

2. **Write the data:** While producing new records, changes are added to the database but remain private to your transaction scope.

3. **Commit or rollback:** When you've finished writing data, commit to make records publicly available to consumers. If there's an issue, call rollback to discard the data instead of publishing it.

From a low-level perspective, there are two implementations depending on your processing model:

**Standalone jobs or ELT workloads:** Processing datasets at the data storage layer directly (e.g., in a data warehouse like BigQuery, Redshift, or Snowflake). The transaction is usually declarative and fully managed by the data store. Despite being under the hood, processing can be distributed.

**Distributed data processing jobs (ETL):** Multiple tasks work in parallel to write a dataset to the same output. Two possible implementations exist:

1. **Local (task-based) transactions:** Each task performs an isolated transaction. Works well if you don't encounter job retries, but we'll discover issues in Consequences.

2. **Whole job is transactional:** The job initializes the transaction before starting tasks and commits once all tasks complete. This provides stronger guarantees than local transactions but is more challenging to achieve. For example, with Apache Spark and Delta Lake, the transaction is committed when the writer creates a new entry in the commit log directory. If this step fails, data files still exist and need to be moved aside.

<ComparisonTable
  beforeTitle="Without Transaction"
  afterTitle="With Transaction"
  beforeColor={colors.red}
  afterColor={colors.green}
  items={[
    { label: "Partial data visibility", before: "Consumers see incomplete writes", after: "Hidden until commit" },
    { label: "Failure handling", before: "Manual cleanup required", after: "Automatic rollback" },
    { label: "Retry behavior", before: "Creates duplicates", after: "Safe overwrites" }
  ]}
/>

The idempotency comes from all-or-nothing transaction semantics. In case of any error, the producer doesn't commit the transaction, leading to either automatic rollback or orphan records in the data storage layer that are not visible to readers. If you backfill the data producer, the writing job initializes a new transaction and inserts the processed records again. Idempotency is guaranteed only for the current run.

> **Warning**
>
> Despite transactions on the writer's side, a reader might still see records from uncommitted transactions if it sets its transaction isolation level to "read uncommitted." In the database world, this side effect is known as dirty reads because the records from uncommitted transactions might be rolled back.

Technologies supporting transactions include modern table file formats (Delta Lake, Apache Iceberg, Apache Hudi), streaming brokers (Apache Kafka), data warehouses (AWS Redshift, GCP BigQuery), and relational database management systems (PostgreSQL, MySQL, Oracle, SQL Server).

Not all technologies integrate perfectly with distributed data processing tools. Table file formats are well covered by major tools (Apache Flink and Apache Spark), whereas Apache Kafka transactional producers are only available for Apache Flink.

#### Consequences

**Commit step:** Unlike a nontransactional write, a transactional one involves two extra steps: opening and committing the transaction, alongside resolving data conflicts at both stages.

The steps may impact overall data availability latency. For example, each file produced in a raw data format like JSON or CSV is immediately visible to consumers. Files generated in a transactional file format like Delta Lake become visible once the producer generates a corresponding commit logfile. Consumers must wait for the slowest task to complete before accessing the transactional data.

This coordination overhead is necessary to provide transactional capability and expose only complete datasets.

**Distributed processing:** Distributed data processing frameworks' support for transactions is not global. For example, Apache Kafka is not supported in Apache Spark, despite its popularity among data engineers. This greatly reduces the application of the pattern.

**Idempotency scope:** Remember, idempotency is limited to the transaction itself! If a distributed data processing framework uses local (task-based) transactions without further coordination to store already committed tasks, any job restart will rewrite the data from committed transactions. The same side effect applies to backfilling scenarios where reprocessing data results in a new transaction eventually adding the same records.

#### Examples

First, let's see an example of the Transactional Writer for a batch pipeline. The pipeline needs to load data from two datasets and apply each individually on the target table:

```sql
-- Two visually separated operations within the same transaction
CREATE TEMPORARY TABLE changed_devices_file1 (LIKE dedp.devices);
COPY changed_devices_file1 FROM '/data_to_load/dataset_1.csv'
  CSV DELIMITER ';' HEADER;
MERGE INTO dedp.devices AS d USING changed_devices_file1 AS c_d
-- ... omitted for brevity

CREATE TEMPORARY TABLE changed_devices_file2 (LIKE dedp.devices);
COPY changed_devices_file2 FROM '/data_to_load/dataset_too_long_type.csv'
  CSV DELIMITER ';' HEADER;
MERGE INTO dedp.devices AS d USING changed_devices_file1 AS c_d
-- ... omitted for brevity

COMMIT;
```

One of the files stores rows with values that are too long for some columns. Because these two merge operations are visually separated, you may think the first will succeed while the second fails. You're right about the result, but we must add an important aspect: none of them will commit. The database won't accept partial success because the SQL runner doesn't reach the commit stage. The same logic works for table file formats where written files are not considered readable until there's a corresponding commit file.

Apache Kafka also works this way for transactions. The producer initializes the transaction by sending a special message to the partition, and once it reaches the commit step, it generates a new metadata event confirming the pending transaction. You can implement the Transactional Writer pattern natively with Kafka producers or from a distributed data processing framework like Apache Flink:

```python
# Transactional data producer with Apache Flink
kafka_sink_valid_data = (KafkaSink.builder().set_bootstrap_servers("localhost:9094")
  .set_record_serializer(KafkaRecordSerializationSchema.builder()
     .set_topic('reduced_visits')
     .set_value_serialization_schema(SimpleStringSchema())
     .build())
  .set_delivery_guarantee(DeliveryGuarantee.EXACTLY_ONCE)
  .set_property('transaction.timeout.ms', str(1 * 60 * 1000))
  .build())
```

Two important attributes here are the delivery guarantee and the transaction timeout. The delivery guarantee involves using transactions for data delivery. The timeout parameter is also important—exactly-once delivery relies on Apache Flink's checkpointing mechanism, which can take some time. If the timeout is too short and the checkpoint takes longer, Flink will be unable to commit the transaction due to its expiration.

---

## 5. Immutable Dataset

So far, you've seen patterns working on mutable datasets where you can alter datasets in any way, including total data removal. But what if you cannot delete or update existing data? A dedicated pattern exists for that category too.

### 5.1. Pattern: Proxy

This pattern is inspired by one of the best-known engineering sayings: "We can solve any problem by introducing an extra level of indirection." Hence its name, the Proxy.

#### Problem

One of your batch jobs generates a full dataset each time. Since you only need the most recent version of the data, you've been overwriting the previous dataset. However, your legal department has asked you to keep copies of all past versions, and consequently, your current mutable approach doesn't hold anymore. You need to rework the pipeline to keep each copy but expose only the most recent table from a single place.

#### Solution

**In plain English:** Keep all versions of your data in separate tables but create a pointer (view) that always shows consumers the latest version—like a "current version" shortcut on your desktop.

**In technical terms:** The Proxy pattern uses an intermediate component (view, manifest, or time travel) between end users and physical storage. Write each dataset version to a new immutable location and expose only the most recent via a single access point.

**Why it matters:** When regulations require keeping all historical versions but consumers need simple access to the latest data, the Proxy pattern provides both immutability guarantees and ease of use.

<DiagramContainer title="Proxy Pattern Architecture">
  <Column gap="lg">
    <Box color={colors.green} variant="filled" size="lg" icon="👁️">
      Proxy Layer (View/Manifest)
    </Box>
    <Arrow direction="down" label="points to latest" />
    <Group title="Immutable Tables (Write-Once)" color={colors.blue} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.slate} variant="outlined" size="sm">table_v1</Box>
        <Box color={colors.slate} variant="outlined" size="sm">table_v2</Box>
        <Box color={colors.blue} variant="filled" size="sm">table_v3 (current)</Box>
      </Row>
    </Group>
  </Column>
</DiagramContainer>

First, guarantee immutability by loading new data into a different location each time. A good solution is using timestamped or versioned tables—regular tables with names suffixed with a version or timestamp to distinguish them. All writing permissions should be removed from these tables after creating them. Consequently, they're writable only once.

You can achieve writable-once semantics more easily if your storage layer sits on top of an object store. Additionally enhance access controls with a locking mechanism known as write once read many (WORM), supported by all major object store services:

<CardGrid
  columns={3}
  cards={[
    {
      title: "AWS S3",
      icon: "☁️",
      color: colors.orange,
      items: ["Object Lock", "Retention modes", "Legal holds"]
    },
    {
      title: "Azure Blob",
      icon: "☁️",
      color: colors.blue,
      items: ["Immutability policies", "Time-based retention", "Legal hold"]
    },
    {
      title: "GCP Storage",
      icon: "☁️",
      color: colors.green,
      items: ["Object holds", "Bucket locks", "Retention policies"]
    }
  ]}
/>

After implementing writable-once semantics, create a single data access point—the proxy. Most of the time, it's a passthrough view that exposes the most recent table without any data transformations in the SELECT statement. This approach works for most data warehouses and relational databases, plus some NoSQL stores (OpenSearch via aliases, Apache Cassandra, ScyllaDB, MongoDB).

If your data store doesn't support a specific view, create a similar structure yourself. It can be a manifest file referencing the location or explicitly listing files that should be processed by consumers. From a responsibility standpoint, it's better to isolate manifest creation from the data processing job. If manifest creation fails, you won't have to reprocess the data, which is typically a much slower operation.

The last alternative strategy applies to table file formats like Delta Lake and Apache Iceberg, plus some data warehouses like GCP BigQuery. Although you can create one table per write for these data stores, a simpler implementation is possible. When you overwrite the table, the data is still there to guarantee time travel capability. Each write produces a new version of the table under the hood and keeps old data on disk available for querying or restoration. However, this solution may have limited and not configurable retention capabilities (like seven days for BigQuery at the moment of writing).

<DiagramContainer title="Proxy Pattern Implementation Strategies">
  <CardGrid
    columns={3}
    cards={[
      {
        title: "Timestamped Tables + View",
        icon: "📊",
        color: colors.blue,
        items: [
          "Create table_YYYYMMDD",
          "View points to latest",
          "Manual immutability"
        ]
      },
      {
        title: "Manifest File",
        icon: "📄",
        color: colors.purple,
        items: [
          "JSON/YAML manifest",
          "Lists current files",
          "Custom access logic"
        ]
      },
      {
        title: "Native Versioning",
        icon: "🔄",
        color: colors.green,
        items: [
          "Delta Lake / Iceberg",
          "Automatic versioning",
          "Built-in time travel"
        ]
      }
    ]}
  />
</DiagramContainer>

It's worth noting that it's not possible to remove write permissions for natively versioned data stores, but thanks to the underlying storage system, permissions management is not required for this solution. The Proxy pattern heavily relies on your database capabilities.

#### Consequences

**Database support:** Not all databases have this great view feature, which will be an immutable access point to expose underlying changing datasets. Although it can be replaced with a manifest file, that makes the reading process more cumbersome.

**Immutability configuration:** You can enforce immutability at the data orchestration level by configuring the output of the triggered writing task. But that won't be enough. You'll need help, maybe from the infrastructure team, to enforce immutability on the data store too. Do this by creating locks on object stores and removing writing permissions from the table once it gets created.

#### Examples

Let's implement the Proxy pattern with Apache Airflow and PostgreSQL. The pipeline is composed of two steps:

```python
# The Proxy pattern's pipeline
load_data_to_internal_table = PostgresOperator(
    sql='/sql/load_devices_to_weekly_table.sql'
)

refresh_view = PostgresOperator(
    # ...
    sql='/sql/refresh_view.sql'
)

load_data_to_internal_table >> refresh_view
```

The pipeline starts by loading data into a hidden internal table. Since this step is a simple COPY command, let's move directly to the view refresh:

```sql
-- View refresh
{% set devices_internal_table = get_devices_table_name() %}
CREATE OR REPLACE VIEW dedp.devices AS
  SELECT * FROM {{ devices_internal_table }};
```

The view refresh is based on a SQL operation that hides an important detail: the generation of the internal table name. If the pipeline's instance reruns, it can't rewrite the previous dataset. Instead, it must write the new dataset to a different table. That's where the `get_devices_table_name` function comes into play:

```python
# Generation of a unique table name
def get_devices_table_name() -> str:
    context = get_current_context()
    dag_run: DagRun = context['dag_run']
    table_suffix = dag_run.start_date.strftime('%Y%m%d_%H%M%S')
    return f'dedp.devices_internal_{table_suffix}'
```

The function uses the pipeline start time to compute a unique suffix for the internal table and guarantee that each load goes to its dedicated storage space.

> **Warning**
>
> The implementation should ensure the user doing the manipulation can only create tables. Otherwise, the user could accidentally delete previously created internal tables and break the immutability guarantee provided by the Proxy pattern.

---

## 6. Summary

Always expecting the worst is probably not the best way to go through life, but it's definitely one of the best approaches for data engineering projects. Errors are inevitable and it's better to be prepared. The backbone of this preparation consists of error management design patterns from Chapter 3. However, they mitigate the impact of failure on the processing layer only.

To complete the cycle of handling error management, you need idempotency and the design patterns described in this chapter.

### Key Takeaways

<CardGrid
  columns={2}
  cards={[
    {
      title: "Overwriting Patterns",
      icon: "🔄",
      color: colors.blue,
      items: [
        "Fast Metadata Cleaner: Use TRUNCATE/DROP on partitioned tables",
        "Data Overwrite: Physically replace data files",
        "Best for: Full dataset replacement scenarios"
      ]
    },
    {
      title: "Update Patterns",
      icon: "🔀",
      color: colors.purple,
      items: [
        "Merger: MERGE/UPSERT for incremental changes",
        "Stateful Merger: Add state tracking for backfill consistency",
        "Best for: Incremental datasets with updates"
      ]
    },
    {
      title: "Database Patterns",
      icon: "💾",
      color: colors.green,
      items: [
        "Keyed Idempotency: Generate stable keys from immutable properties",
        "Transactional Writer: Use all-or-nothing transaction semantics",
        "Best for: Leveraging native database capabilities"
      ]
    },
    {
      title: "Immutability Pattern",
      icon: "🔒",
      color: colors.orange,
      items: [
        "Proxy: Write-once tables with a single access point",
        "Versioned storage with views or manifests",
        "Best for: Compliance and audit requirements"
      ]
    }
  ]}
/>

You saw data overwriting patterns that automatically replace the dataset, either by leveraging fast metadata operations like TRUNCATE or DROP or simply by physically replacing the dataset files. The overwriting patterns are good if you have the whole dataset available in each operation.

If that's not the case and your input is an incremental version, you can use the Merger pattern. Even though the combination operation looks costly at first glance, modern data storage solutions optimize it by leveraging metadata (statistics) too.

These overwriting and update pattern categories mostly rely on the data orchestration layer. If you don't have one, maybe because your job is a streaming job, you can rely on the database itself for idempotency. Use either idempotent row key generation or transactions to ensure unique record delivery, even under retries.

Finally, sometimes your data must remain immutable (i.e., you must be able to write it only once). This scenario isn't supported by the patterns presented so far. Instead, opt for the Proxy pattern and use an intermediary layer to expose the data.

> **Insight**
>
> These last two chapters on error management and idempotency talked mostly about technical aspects of data engineering. Even though they help improve business value, error management and idempotency don't generate meaningful datasets alone. Instead, leverage the data value design patterns covered in the next chapter!

---

**Previous:** [Chapter 3: Error Management Design Patterns](./chapter3) | **Next:** [Chapter 5: Data Value Design Patterns](./chapter5)
