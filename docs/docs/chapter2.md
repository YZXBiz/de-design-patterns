---
sidebar_position: 2
title: "Chapter 2: Data Ingestion Design Patterns"
description: "Master data ingestion patterns including full load, incremental load, CDC, replication strategies, compaction, and event-driven triggers for building robust data pipelines"
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';

# Chapter 2: Data Ingestion Design Patterns

> **"Bringing data to your system is a key task for making your life and your users' lives better."**
>
> — The Foundation of Data Engineering

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Full Load](#2-full-load)
   - 2.1. [Pattern: Full Loader](#21-pattern-full-loader)
3. [Incremental Load](#3-incremental-load)
   - 3.1. [Pattern: Incremental Loader](#31-pattern-incremental-loader)
   - 3.2. [Pattern: Change Data Capture](#32-pattern-change-data-capture)
4. [Replication](#4-replication)
   - 4.1. [Pattern: Passthrough Replicator](#41-pattern-passthrough-replicator)
   - 4.2. [Pattern: Transformation Replicator](#42-pattern-transformation-replicator)
5. [Data Compaction](#5-data-compaction)
   - 5.1. [Pattern: Compactor](#51-pattern-compactor)
6. [Data Readiness](#6-data-readiness)
   - 6.1. [Pattern: Readiness Marker](#61-pattern-readiness-marker)
7. [Event Driven](#7-event-driven)
   - 7.1. [Pattern: External Trigger](#71-pattern-external-trigger)
8. [Summary](#8-summary)

---

## 1. Introduction

**In plain English:** Data ingestion is like setting up the front door to your house - you need to make sure the right things come in at the right time, in the right condition, and that nothing important gets lost or broken along the way.

**In technical terms:** Data ingestion is the process of acquiring data from various producers (other pipelines, teams, or organizations) and bringing it into your data engineering system to feed analytics and data science workloads.

**Why it matters:** Without proper data ingestion patterns, you risk incomplete datasets, inefficient data organization, or completely broken data requiring costly restoration and backfilling processes. Getting data ingestion right is fundamental to making your life and your users' lives better.

### 1.1. The Challenge

Data engineering systems are rarely data generators. More often, their first stage is data acquisition from various data producers. Working with these producers is not easy; they can be different pipelines inside your team, different teams within your company, or even completely different organizations. Because each producer has dedicated constraints inherited from technical and business environments, interacting with them may be challenging.

> **Insight**
>
> Data ingestion is not reserved for the front doors of your system or for simple EL pipelines. Most patterns discussed here are excellent candidates for the extract step in ETL and ELT pipelines, so you may use them in more business-oriented jobs as well.

### 1.2. Patterns Covered

This chapter addresses scenarios and challenges you may face while integrating data from external providers or from your other pipelines:

- **Full and incremental loads** - Acquire all or part of the dataset
- **Data replication** - Copy data with and without transformation
- **Data compaction** - Address the small files problem
- **Data readiness** - Know when to start the ingestion process
- **External triggers** - Handle unpredictable data availability

---

## 2. Full Load

**In plain English:** Full load is like replacing your entire photo collection every time you add new photos - you copy everything, not just the new ones.

**In technical terms:** The full load design pattern refers to the data ingestion scenario that works on a complete dataset each time, useful for database bootstrap or reference dataset generation.

**Why it matters:** Full load is the simplest ingestion pattern, ideal for small, slowly changing datasets where you cannot detect which rows have changed since the last ingestion.

### 2.1. Pattern: Full Loader

#### Problem

You're setting up the Silver layer for your use case. One of the transformation jobs requires extra information about devices from an external data provider. This device dataset changes only a few times a week. It's also a very slowly evolving entity with the total number of rows not exceeding one million. Unfortunately, the data provider doesn't define any attribute that could help you detect the rows that have changed since the last ingestion.

#### Solution

The lack of the last updated value in the dataset makes the Full Loader pattern an ideal solution to the problem.

<DiagramContainer title="Full Loader Pattern">
  <ProcessFlow
    direction="horizontal"
    steps={[
      { title: "Extract", description: "Read complete dataset from source", icon: "📥", color: colors.blue },
      { title: "Transform (Optional)", description: "Adapt format if needed", icon: "⚙️", color: colors.purple },
      { title: "Load", description: "Write to destination", icon: "💾", color: colors.green }
    ]}
  />
</DiagramContainer>

The simplest implementation relies on two steps, extract and load (EL). It uses native data stores commands to export data from one database and import it to another. This EL approach is ideal for homogeneous data stores because it doesn't require any data transformation.

> **Insight**
>
> **Passthrough Jobs:** Extract and load jobs are also known as passthrough jobs because the data is simply passing through the pipeline, from the source to the destination.

Unfortunately, using EL pipelines will not always be possible. If you need to load data between heterogeneous databases, you will need to adapt the input format to the output format with a thin transformation layer between the extract and load steps. Your pipeline then becomes an extract, transform, load (ETL) job, where you can leverage a data processing framework that often provides native interfaces for interacting with various data stores.

#### Consequences

Despite this simple task of moving a dataset between two data stores, the Full Loader pattern comes with some challenges.

**Data Volume**

The Full Loader's implementations will often be batch jobs running on some regular schedule. If the data volume of the loaded dataset grows slowly, your data loading infrastructure will probably work without any issues for a long time thanks to these almost constant compute needs.

On the other hand, a more dynamically evolving dataset can lead to some issues if you use static compute resources to process it. For example, if the dataset doubles in size from one day to another, the ingestion process will be slower and can even fail due to static hardware limitations.

> **Warning**
>
> To reduce data variability impact on your data loading process, you should leverage the auto-scaling capabilities of your data processing layer.

**Data Consistency**

The second risk related to the Full Loader pattern is the risk of losing data consistency. As the data must be completely overwritten, you may be tempted to fully replace it in each run with a drop-and-insert operation. If you opt for this strategy, you should be aware of its shortcomings.

First, think about data consistency from the consumer's perspective. What if your data ingestion process runs at the same time as the pipelines reading the dataset? Consumers might process partial data or even not see any data at all if the insert step doesn't complete. Transactions automatically manage data visibility, and they're the easiest mitigation of this concurrency issue. If your data store doesn't support transactions, you can rely on a single data exposition abstraction, such as a view, and manipulate only the underlying technical and hidden structures.

<DiagramContainer title="Single Data Exposition Pattern">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg">
      View: devices (public interface)
    </Box>
    <Row gap="lg">
      <Column gap="sm" align="center">
        <Box color={colors.green} variant="outlined">devices_v1</Box>
        <Box color={colors.slate} variant="subtle" size="sm">Previous version</Box>
      </Column>
      <Column gap="sm" align="center">
        <Box color={colors.purple} variant="outlined">devices_v2</Box>
        <Box color={colors.slate} variant="subtle" size="sm">Current version (active)</Box>
      </Column>
      <Column gap="sm" align="center">
        <Box color={colors.orange} variant="outlined">devices_v3</Box>
        <Box color={colors.slate} variant="subtle" size="sm">Next version (loading)</Box>
      </Column>
    </Row>
  </Column>
</DiagramContainer>

Second, keep in mind that you may need to use the previous version of the dataset if unexpected issues arise. If you fully overwrite your dataset, you may not be able to perform this action, unless you use a format supporting the time travel feature, such as Delta Lake, Apache Iceberg, or GCP BigQuery. Eventually, you can also implement the feature on your own by relying on the single data exposition abstraction concept.

> **Insight**
>
> Although this chapter discusses data ingestion, remember that all the patterns presented here directly impact data analytics and data science workloads, as they load the data into the system.

#### Examples

Let's see how to implement the pattern in different technical contexts. First, if you have to ingest a dataset between two identical or compatible data stores, you can simply write a script and deploy it to your runtime service.

**Example: Synchronization of S3 buckets**

```bash
aws s3 sync s3://input-bucket s3://output-bucket --delete
```

The command automatically synchronizes the content of the buckets and removes all objects missing in the source but present in the destination (the `--delete` argument).

Commands like `aws s3 sync` are a great way to simply move datasets, but sometimes, the load operation may require some fine-tuning, like adding parallel or distributed processing. An example of such an implementation is Apache Spark.

**Example: Extract load implementation with Apache Spark and Delta Lake**

```python
input_data = spark.read.schema(input_data_schema).json("s3://devices/list")

input_data.write.format("delta").save("s3://master/devices")
```

Apache Spark, as a distributed data processing framework, can be seamlessly scaled so that even drastically changing volumes shouldn't negatively impact the data ingestion job as long as you scale your compute infrastructure. Besides, if you use it with a table file format like Delta Lake, you automatically address the consistency issues presented previously, thanks to the transactional and versioning capabilities.

**Example: PostgreSQL with versioned tables**

You can also implement the pattern for databases without native versioning capability. The implementation requires dedicated data ingestion and data exposition tasks.

The data ingestion task writes the dataset to an explicitly versioned table:

```sql
COPY devices_${version} FROM '/data_to_load/dataset.csv' CSV DELIMITER ';' HEADER;
```

Next, the exposition task changes the reference of the view exposed to the end users:

```sql
CREATE OR REPLACE VIEW devices AS SELECT * FROM devices_${version}
```

The pipeline may require additional steps, such as retrieving the input dataset and creating versioned tables, which are available in the GitHub repository.

---

## 3. Incremental Load

**In plain English:** Incremental load is like adding only new photos to your collection instead of copying all photos every time - you only move what's new or changed.

**In technical terms:** Incremental load patterns ingest smaller parts of a physically or logically divided dataset, processing only the data that has changed or been added since the last execution, often at a higher frequency.

**Why it matters:** Full load can be costly to implement for continuously growing datasets. Incremental load is more efficient because it processes only new data, reducing compute costs and ingestion time.

### 3.1. Pattern: Incremental Loader

#### Problem

In your blog analytics use case, most visit events come from a streaming broker in real time. But some of them are still being written to a transactional database by legacy producers.

You need to create a dedicated data ingestion process to bring these legacy visits to the Bronze layer. Due to the continuously increasing data volume, the process should only integrate the visits added since the last execution. Each visit event is immutable.

#### Solution

The continuously growing dataset is a good condition in which to use the Incremental Loader pattern. There are two possible implementations that depend on the input data structure:

1. **Delta column implementation** - Uses a delta column (typically ingestion time for immutable events) to identify rows added since the last run
2. **Partition-based implementation** - Relies on time-partitioned datasets where the ingestion job uses time-based partitions to detect new records

> **Warning**
>
> **Be Aware of Real-Time Issues:** Using event time as a delta column is risky. Your ingestion process might miss records if your data producer emits late data for the event time you already processed.

<DiagramContainer title="Two Incremental Loader Implementations">
  <Column gap="lg">
    <Group title="Delta Column Implementation" color={colors.blue} direction="column">
      <Row gap="md">
        <Box color={colors.blue} icon="📊">Source Table</Box>
        <Arrow direction="right" label="WHERE ingestion_time > last_run" />
        <Box color={colors.purple} icon="⚙️">Filter New Rows</Box>
        <Arrow direction="right" />
        <Box color={colors.green} icon="💾">Destination</Box>
      </Row>
      <Box color={colors.orange} variant="subtle" size="sm">
        Requires tracking last ingestion time
      </Box>
    </Group>
    <Group title="Partition-Based Implementation" color={colors.green} direction="column">
      <Row gap="md">
        <Box color={colors.blue} icon="📁">Partitioned Source</Box>
        <Arrow direction="right" label="Read partition=2024-01-01" />
        <Box color={colors.purple} icon="⚙️">Process Partition</Box>
        <Arrow direction="right" />
        <Box color={colors.green} icon="💾">Destination</Box>
      </Row>
      <Box color={colors.orange} variant="subtle" size="sm">
        Partition to process resolved from execution date
      </Box>
    </Group>
  </Column>
</DiagramContainer>

The delta column implementation needs to remember the last ingestion time value to incrementally process new rows. On the other hand, the partition-based implementation doesn't have this requirement because it can implicitly resolve the partition to process from the execution date. For example, if the loader runs at 11:00, it can target the partition for the previous hour.

#### Consequences

The incremental quality is nice for reducing ingested data volume, but it can also be challenging.

**Hard Deletes**

Using the pattern can be tricky for mutable data. If the ingestion process relies on the delta column, it can identify the updated rows and copy their most recent version. Unfortunately, it's not that simple for deleted rows.

When a data provider deletes a row, the information physically disappears from the input dataset. However, it's still present in your version of the dataset because the delta column doesn't exist for a deleted row. To overcome this issue you can rely on soft deletes, where the producer, instead of physically removing the data, simply marks it as removed. Put differently, it uses the UPDATE operation instead of DELETE.

> **Insight**
>
> **Insert-Only Tables:** Another answer to the mutability issue could be insert-only datasets. As the name suggests, they accept only new rows via an INSERT operation. They shift the data reconstruction responsibility onto consumers, who must correctly detect any deleted and modified entries. Insert-only tables are also known as append-only tables.

**Backfilling**

Even these basic data ingestion tasks have a risk of backfilling. The pattern might have a surprisingly bad effect on your data ingestion pipelines in that scenario.

Let's imagine a pipeline relying on the delta column implementation. After processing two months of data, you were asked to start a backfill. Now, when you launch the ingestion process, you'll be doing the full load instead of the incremental one. Therefore, the job will need more resources to accommodate the extra rows.

Thankfully, you can mitigate the problem by limiting the ingestion window. For example, if your ingestion job runs hourly, you can limit the ingestion process to one hour only. In SQL, it can be expressed as `delta_column BETWEEN ingestion_time AND ingestion_time + INTERVAL '1 HOUR'`. This operation brings two things:

- **Better control over data volume** - Even in the case of backfilling, you won't be surprised by the compute needs
- **Simultaneous ingestion** - You can run multiple concurrent backfilling jobs at the same time, as long as the input data store supports them

The dataset size problem doesn't happen in the partition-based implementation if your ingestion job works on one partition at a time.

#### Examples

**Example: Synchronization of S3 buckets (partition-based)**

```bash
aws s3 sync s3://input/date=2024-01-01 s3://output/date=2024-01-01 --delete
```

The script-based example simply moves all objects with the `date=2024-01-01` prefix key to another bucket. If you omit the `date=2024-01-01` prefix from the right side of the command, the ingestion task will flatten the output storage layout.

**Example: Partition-based implementation with Apache Airflow and Apache Spark**

```python
next_partition_sensor = FileSensor(
    task_id='input_partition_sensor',
    filepath=get_data_location_base_dir() + '/{{ data_interval_end | ds }}',
    mode='reschedule',
)
load_job_trigger = SparkKubernetesOperator(
    application_file='load_job_spec.yaml',
    # ... omitted for brevity
)
load_job_sensor = SparkKubernetesSensor(
    # ... omitted for brevity
)

next_partition_sensor >> load_job_trigger >> load_job_sensor
```

The workflow in Apache Airflow starts with a `FileSensor` waiting for the next partition to be available. This is required to avoid loading partial data and propagating an invalid dataset. Once the partition is ready, the pipeline triggers the data ingestion job.

The job definition leverages immutable execution time:

```yaml
# ...
  mainClass: com.waitingforcode.EventsLoader
  mainApplicationFile: "local:///tmp/dedp-1.0-SNAPSHOT-jar-with-dependencies.jar"
  arguments:
    - "/data_for_demo/input/date={{ ds }}"
    - "/data_for_demo/output/date={{ ds }}"
```

**Example: Delta column implementation**

```python
load_job_trigger = SparkKubernetesOperator(
    # ...
    application_file='load_job_spec_for_delta_column.yaml',
)
load_job_sensor = SparkKubernetesSensor(
    # ...
)

load_job_trigger >> load_job_sensor
```

The delta column implementation removes the sensor step and executes the ingestion job directly. The job includes an extra filtering operation:

```python
in_data = (spark_session.read.text(input_path).select('value',
    functions.from_json(functions.col('value'), 'ingestion_time TIMESTAMP')))

input_to_write = in_data.filter(
    f'ingestion_time BETWEEN "{date_from}" AND "{date_to}"'
)

input_to_write.mode('append').select('value').write.text(output_path)
```

Thanks to the filter with time boundaries, if you need to run a job execution again, it will not take any extra records, thus guaranteeing consistent data volume.

---

### 3.2. Pattern: Change Data Capture

**In plain English:** CDC is like having a camera constantly watching a database and instantly recording every change that happens - inserts, updates, and deletes - so you can replay them elsewhere in near real-time.

**In technical terms:** Change Data Capture (CDC) continuously ingests all modified rows directly from the internal database commit log, providing lower latency access compared to high-level query or processing tasks.

**Why it matters:** CDC guarantees lower ingestion latency and captures all types of data operations, including hard deletes, making it ideal for scenarios requiring near real-time data synchronization (typically within 30 seconds).

#### Problem

The legacy visit events you integrated with the Incremental Loader must evolve. Their ingestion rate is too slow, and downstream consumers have started to complain about too much time spent waiting for the data. Your product manager asked you to integrate these transactional records into your streaming broker as soon as possible. The ingestion job must capture each change from the table within 30 seconds and make it available to other consumers from a central topic.

#### Solution

The latency requirement makes it impossible to use the Incremental Loader. The pattern has some job scheduling and query execution overheads that could make the expected latency difficult to reach.

A better candidate is the Change Data Capture (CDC) pattern. Due to its internal ingestion mechanism, it guarantees lower latency. The pattern consists of continuously ingesting all modified rows directly from the internal database commit log. It allows lower-level and faster access to the records, compared to any high-level query or processing task.

<DiagramContainer title="Change Data Capture Architecture">
  <Row gap="md">
    <Column gap="sm">
      <Box color={colors.blue} icon="🗄️" size="lg">Database</Box>
      <Box color={colors.purple} variant="subtle" size="sm">Commit Log</Box>
    </Column>
    <Arrow direction="right" label="Stream changes" />
    <Box color={colors.purple} icon="📡">CDC Consumer</Box>
    <Arrow direction="right" label="Publish" />
    <Box color={colors.green} icon="📨">Streaming Broker</Box>
    <Arrow direction="right" />
    <Box color={colors.orange} icon="👥">Consumers</Box>
  </Row>
</DiagramContainer>

A commit log is an append-only structure that records any operations on existing rows at the end of the logfile. The CDC consumer streams those changes and sends them to the streaming broker or any other configured output. From that point on, consumers can do whatever they want with the data, such as storing the whole history of changes or keeping the most recent value for each row.

Besides guaranteeing lower latency, CDC intercepts all types of data operations, including hard deletes. So there is no need to ask data producers to use soft deletes for data removal.

#### Consequences

The latency promise is great, but like any engineering component, it also brings its own challenges.

**Complexity**

The CDC pattern is different from the two others covered so far as it requires different setup skills. The Full Loader and Incremental Loader can be implemented by a data engineer alone, as long as the required compute and orchestration layers exist. The CDC pattern may need some help from the operations team, for example, to enable the commit log on the servers.

**Data Scope**

Be careful about the data scope you want to target with this pattern. Depending on the client's implementation, you may be able to get the changes made only after starting the client process. If you are interested in the previous changes too, you will need to combine CDC with other data ingestion patterns from this chapter.

**Payload**

Besides latency, another difference between CDC and the Incremental Loader is the payload. CDC will bring additional metadata with the records, such as the operation type (update, insert, delete), modification time, or column type. As a consumer of this data, you may need to adapt your processing logic to ignore irrelevant attributes.

**Data Semantics**

Don't get this wrong; the pattern ingests data at rest. As a side effect, these static rows become data in motion. Why is this worth emphasizing? Data in motion has different processing semantics for many operations that appear to be trivial in the data-at-rest world.

> **Insight**
>
> Let's look at an example of the JOIN operation. If you perform it against static tables orchestrated from your data orchestration layer and you don't get a result, it's because there is no matching data. But if you run the query against two dynamic streaming sources and you don't get a match, it's because the data might not be there yet. One stream can simply be later than the other, and the JOIN operation may eventually succeed in the future. For that reason, you shouldn't consider the data ingested from the CDC consumer to be static data.

#### Examples

There are many ways to implement the pattern. You can create your own commit log reader or rely on available solutions. One of the most popular open source solutions is Debezium. The framework supports many relational and NoSQL databases and uses Kafka Connect as the bridge between the data-at-rest and data-in-motion worlds.

**Example: Debezium Kafka Connect configuration for PostgreSQL**

```json
{
  "name": "visits-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "postgres",
    "database.dbname" : "postgres",
    "database.server.name": "dbserver1",
    "schema.include.list": "dedp_schema",
    "topic.prefix": "dedp"
  }
}
```

This configuration file defines the connection parameters, all schemas to include in the watching operation, and the prefix for the created topic for each synchronized table. If there is a `dedp_schema.events` table, the connector will write all changes to the `dedp.dedp_schema.events` topic.

<DiagramContainer title="Debezium Architecture">
  <Column gap="md">
    <Row gap="md">
      <Box color={colors.blue} icon="🗄️">PostgreSQL Database</Box>
      <Arrow direction="right" label="Read commit log" />
      <Box color={colors.purple} icon="🔌">Kafka Connect + Debezium</Box>
    </Row>
    <Arrow direction="down" />
    <Row gap="sm">
      <Box color={colors.green} variant="outlined" size="sm">dedp.schema.table1</Box>
      <Box color={colors.green} variant="outlined" size="sm">dedp.schema.table2</Box>
      <Box color={colors.green} variant="outlined" size="sm">dedp.schema.table3</Box>
    </Row>
    <Box color={colors.slate} variant="subtle" size="sm">Apache Kafka Topics</Box>
  </Column>
</DiagramContainer>

Besides creating a new Kafka Connect task, you need to prepare the database. PostgreSQL expects the logical replication stream enabled with the `pgoutput` plug-in and a user with all necessary privileges. This illustrates why the CDC pattern is more challenging in terms of setup than the Incremental Loader.

**Example: Delta Lake Change Data Feed (CDF)**

The good news is that lake-native formats support CDC in a simpler way. Delta Lake has a built-in change data feed feature to stream changed rows.

```python
# Global session property
spark_session_builder \
  .config('spark.databricks.delta.properties.defaults.enableChangeDataFeed', 'true')

# Table-level property
spark_session.sql('''
  CREATE TABLE events (
    visit_id STRING, event_time TIMESTAMP, user_id STRING, page STRING
  )
  TBLPROPERTIES (delta.enableChangeDataFeed = true)''')
```

With the `enableChangeDataFeed` property, you can configure throughput limits with `maxFilesPerTrigger` or `maxBytesPerTrigger`. The tables also support time travel, so you can start reading from a particular version:

```python
events = (spark_session.readStream.format('delta')
    .option('maxFilesPerTrigger', 4)
    .option('readChangeFeed', 'true')
    .option('startingVersion', 0)
    .table('events'))
query = events.writeStream.format('console').start()
```

The CDF table contains extra columns compared to a classical table:

```
+-------------+-------------------+------------+---------------+--------------------+
|     visit_id|         event_time|_change_type|_commit_version|   _commit_timestamp|
+-------------+-------------------+------------+---------------+--------------------+
| 1400800256_0|2023-11-24 01:44:00|      insert|              6|2023-12-03 13:28:...|
| 1400800256_1|2023-11-24 01:36:00|      insert|              6|2023-12-03 13:28:...|
| 1400800256_2|2023-11-24 01:44:00|      insert|              6|2023-12-03 13:28:...|
| 1400800256_3|2023-11-24 01:37:00|      insert|              6|2023-12-03 13:28:...|
+-------------+-------------------+------------+---------------+--------------------+
```

The extra columns beginning with `_` indicate how the row changed, at which version, and when. If you apply in-place operations like UPDATE, the changes feed will contain rows for both pre- and post-update versions, identifiable with `update_preimage` and `update_postimage` types.

---

## 4. Replication

**In plain English:** Replication is like making an exact photocopy of a document - you want everything to look exactly the same, preserving all the details and formatting.

**In technical terms:** Data replication copies data as is from one location to another, ideally between the same type of storage while preserving all metadata attributes such as primary keys or event positions.

**Why it matters:** Replication ensures consistency across environments (development, staging, production) and enables testing with real data while maintaining the exact structure and characteristics of the source.

> **Insight**
>
> **Data Loading Versus Replication:** These two concepts look similar at first glance, but there is a slight difference. Replication is about moving data between the same type of storage and ideally preserving all its metadata attributes. Loading is more flexible and doesn't have this homogeneous environment constraint.

### 4.1. Pattern: Passthrough Replicator

#### Problem

Your deployment process consists of three separate environments: development, staging, and production. Many of your jobs use a reference dataset with device parameters that you load daily on production from an external API. For a better development experience and easier bug detection, you want to have this dataset in the remaining environments.

The reference dataset loading process uses a third-party API and is not idempotent. This means that it may return different results for the same API call throughout the day. That's why you can't simply copy and replay the loading pipeline in the development and staging environments. You need the same data as in production.

#### Solution

A data provider which is not idempotent, plus the required consistency across environments, is a great reason to use the Passthrough Replicator pattern. You can set it up either at the compute level or the infrastructure level.

<DiagramContainer title="Passthrough Replicator Approaches">
  <Column gap="lg">
    <Group title="Compute-Based" color={colors.blue} direction="column">
      <Row gap="md">
        <Box color={colors.blue} icon="📊">Source</Box>
        <Arrow direction="right" label="EL Job" />
        <Box color={colors.green} icon="💾">Destination</Box>
      </Row>
      <Box color={colors.slate} variant="subtle" size="sm">Copy files/rows without transformation</Box>
    </Group>
    <Group title="Infrastructure-Based" color={colors.purple} direction="column">
      <Row gap="md">
        <Box color={colors.blue} icon="🗄️">Source Storage</Box>
        <Arrow direction="right" label="Replication Policy" />
        <Box color={colors.green} icon="🗄️">Target Storage</Box>
      </Row>
      <Box color={colors.slate} variant="subtle" size="sm">Provider handles replication automatically</Box>
    </Group>
  </Column>
</DiagramContainer>

The **compute implementation** relies on the EL job, which is a process with only two phases: read and write. Ideally, the EL job will copy files or rows from the input as is (without any data transformation). Otherwise, it could introduce data quality issues, such as type conversion from string to dates or rounding of floating numbers.

The **infrastructure implementation** is based on a replication policy document where you configure the input and output location and let your data storage provider replicate the records on your behalf.

#### Consequences

The key learning here is to keep the implementation simple. However, even the simplest implementation possible may have some challenges to address.

**Keep It Simple**

Remember, you need the data as is. To reduce the interference risk in the replicated dataset, you should rely on the simplest replication job possible, which is ideally the data copy command available in the database.

However, when the command is not available and you must use a data processing framework for a text format like JSON, avoid relying on the JSON I/O API. Instead, use the simpler raw text API that will take and copy lines as they are, without any prior interpretation.

Additionally, if you do care about other aspects, such as the same number of files or even the same filenames, you should avoid using a distributed data processing framework if it doesn't let you customize those parameters.

**Security and Isolation**

Cross-environment communication is always tricky and can be error prone if the replication job has bugs. In that scenario, there is a risk of negatively impacting the target environment, even to the point of making it unstable. You certainly don't want to take that risk in production, so for that reason, you should implement the replication with the **push approach** instead of pull. This means that the environment owning the dataset will copy it to the others and thus control the process with its frequency and throughput.

> **Warning**
>
> Even though the push strategy greatly reduces the risk of instability, you can still encounter some issues. You can imagine a use case when you start a job on your cloud subscription and it takes the last available IP address in the data processing subnet. Other jobs will not run as long as the replicator doesn't complete.

**PII Data**

If the replicated dataset stores personally identifiable information (PII), or any kind of information that cannot be propagated from the production environment, use the Transformation Replicator pattern instead. It adds an extra transformation step to get rid of any unexpected attributes.

**Latency**

The infrastructure-based implementation often has some extra latency, and you should always check the service level agreement (SLA) of the cloud provider to see if it's acceptable as the solution. Even though the problem announcement discusses a development experience, you might want to implement it for other and more time-sensitive scenarios.

**Metadata**

Do not ignore the metadata part because it could make the replicated dataset unusable. For example, replicating only the Apache Parquet files of a Delta Lake table will not be enough. The same applies to Apache Kafka, where you should care not only about the key and values but also about headers and the order of events within the partition.

#### Examples

You can implement the pattern in two ways. The first implementation relies on code, which can be either a distributed data processing framework or a data copy utility script.

**Example: JSON data replication with Apache Spark**

```python
input_dataset = spark_session.read.text(f'{base_dir}/input/date=2023-11-01')
input_dataset.write.mode('overwrite').text(f'{base_dir}/output-raw/date=2023-11-01')
```

The code uses Apache Spark to synchronize semi-structured JSON files. It uses the simplest API possible to copy JSON lines data without any interference in the data itself. However, please notice that this snippet doesn't preserve the files (the number of files in the source and destination can be different, even though they will both store the same data).

**Example: Passthrough Replicator with ordering semantic (Apache Kafka)**

```python
events_to_replicate = (input_data_stream
    .selectExpr('key', 'value', 'partition', 'headers', 'offset'))

def write_sorted_events(events: DataFrame, batch_number: int):
    (events.sortWithinPartitions('offset', ascending=True).drop('offset').write
        .format('kafka')
        .option('kafka.bootstrap.servers', 'localhost:9094')
        .option('topic', 'events-replicated')
        .option('includeHeaders', 'true')
        .save())

write_data_stream = (events_to_replicate.writeStream
    .option('checkpointLocation', f'{get_base_dir()}/checkpoint-kafka-replicator')
    .foreachBatch(write_sorted_events))
```

This example would be a simple extract and load job if it didn't have the `write_sorted_events` function. The function is crucial to guaranteeing that the replicated records include the metadata (`.option('includeHeaders'...)`) and keep the same order as the input records (`sortWithinPartitions('offset', ascending=True)`).

**Example: AWS S3 bucket replication with Terraform**

```hcl
resource "aws_s3_bucket_replication_configuration" "replication" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.devices_production.id

  rule {
    id = "devices"
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.devices_staging.arn
      storage_class = "STANDARD"
    }
  }
}
```

This is an example of infrastructure-based replication where the cloud provider handles the replication automatically based on the policy configuration.

---

### 4.2. Pattern: Transformation Replicator

**In plain English:** Transformation Replicator is like making a photocopy but redacting sensitive information first - you blur out social security numbers and addresses before copying.

**In technical terms:** Transformation Replicator adds a transformation layer between read and write operations to remove or anonymize sensitive attributes that shouldn't be replicated to non-production environments.

**Why it matters:** Production data is invaluable for testing because it reflects real-world issues that synthetic data can't simulate, but PII and sensitive data must be removed or anonymized before replication to comply with privacy regulations.

#### Problem

Before releasing a new version of your data processing job, you want to perform tests against real data to avoid surprises during production. You can't use a synthetic data generator because your data provider often has data quality issues and it's impossible to simulate them with any tool. You have to replicate the data from production to the staging environment. Unfortunately, the replicated dataset contains PII data that is not accessible outside the production environment. As a result, you can't use a simple Passthrough Replicator job.

#### Solution

One big problem of testing data systems is the data itself. If the data provider cannot guarantee consistent schema and values, using production data is unavoidable. Unfortunately, production data very often has some sensitive attributes that can't move to other environments, where possibly more people can access it due to less strict access policies.

In that scenario, you should implement the Transformation Replicator pattern, which, in addition to the classical read and write parts from the Passthrough Replicator pattern, has a transformation layer in between.

<DiagramContainer title="Transformation Replicator">
  <Row gap="md">
    <Box color={colors.blue} icon="📊">Source</Box>
    <Arrow direction="right" label="Read" />
    <Box color={colors.purple} icon="🔒">Transform</Box>
    <Arrow direction="right" label="Write" />
    <Box color={colors.green} icon="💾">Destination</Box>
  </Row>
  <Box color={colors.orange} variant="subtle">
    Transformation: Remove or anonymize PII fields
  </Box>
</DiagramContainer>

Transformation is a generic term, but depending on your technical stack, it can be implemented as either of the following:

- A **custom mapping function** if you use a data processing framework like Apache Spark or Apache Flink
- A **SQL SELECT statement** if your processing logic can be easily run and expressed in SQL

The transformation consists of either replacing the attributes that shouldn't be replicated (for example, with the Anonymizer pattern) or simply removing them if they are not required for processing.

#### Consequences

Since you'll be writing some custom logic, the risk of breaking the dataset is higher than with the Passthrough Replicator. And that's not the only drawback of the pattern!

**Transformation Risk for Text File Formats**

Let's look at a rather innocent transformation example on top of a text file format such as JSON or CSV. You defined a schema for the replicated dataset but didn't notice that the datetime format is different from the standard used by your data processing framework. As a result, the replicated dataset doesn't contain all the timestamp columns and your job of staging fails because of that. Although you should be able to fix the issue very quickly, it causes unnecessary work in the release process.

> **Warning**
>
> You should still apply the "keep it simple" approach here. In this example, instead of defining timestamp columns as is, you can simply configure them as strings and not worry about any silent transformations.

**Desynchronization**

You need to take special care that the replication jobs implement this pattern to avoid any privacy-related issues. Data is continuously evolving, and nothing guarantees that the privacy fields you have today will still be valid in the future. Maybe new ones will appear or attributes that are not currently considered PII will be reclassified as PII.

To avoid these kinds of issues, if possible, you should rely on a data governance tool, such as a data catalog or a data contract in which the sensitive fields are tagged. With such a tool, you can automatize the transformation logic. Otherwise, you'll need to implement the rules on your own.

#### Examples

There are two possible implementation approaches: data reduction and data transformation.

**Example: Dataset reduction with EXCEPT operator**

```sql
SELECT * EXCEPT (ip, latitude, longitude)
```

Some databases and compute layers, such as Databricks and BigQuery, support an `EXCEPT` operator that selects all rows but excludes specified columns.

**Example: Dataset reduction with drop function**

```python
input_delta_dataset = spark_session.read.format('delta').load(users_table_path)
users_no_pii = input_delta_dataset.drop('ip', 'latitude', 'longitude')
```

You can leverage your data processing framework to remove irrelevant columns using functions like PySpark's `drop`.

**Example: Column-level access control**

```sql
GRANT SELECT (visit_id, event_time, user_id) ON TABLE visits TO user_a
```

An alternative way to transform the dataset consists of controlling access to it. This AWS Redshift example shows how to grant permissions on a subset of fields. The `user_a` will only be able to access the three columns mentioned after the SELECT operation. Although this is more verbose than the EXCEPT-based solution, it adds an extra layer of protection for accessing private attributes.

**Example: Column-based transformation**

```python
devices_trunc_full_name = (input_delta_dataset
    .withColumn('full_name',
        functions.expr('SUBSTRING(full_name, 2, LENGTH(full_name))'))
)
```

Column-based transformations work great for column-targeted operations. This example truncates the `full_name` field to anonymize it.

**Example: Mapping function (Scala Spark API)**

```scala
case class Device(`type`: String, full_name: String, version: String) {
  lazy val transformed = {
    if (version.startsWith("1.")) {
      this.copy(full_name = full_name.substring(1), version = "invalid")
    } else {
      this
    }
  }
}
inputDataset.as[Device].map(device => device.transformed)
```

If you need to operate at the row level or if the modification rule is complex, you may need a mapping function. This code leverages the Scala API for Apache Spark, converts input rows to a specific type, applies the transformation logic, and exposes an eventually modified row.

---

## 5. Data Compaction

**In plain English:** Data compaction is like organizing thousands of loose papers scattered across your desk into a few neat binders - it makes everything faster to find and easier to work with.

**In technical terms:** Data compaction combines multiple smaller files into bigger ones, reducing the overall I/O overhead on reading and minimizing metadata-related operations like file listing.

**Why it matters:** Even a perfect dataset can become a bottleneck when it grows over time due to many small files. Metadata operations can take even longer than data processing transformations, seriously impacting both latency and cost.

### 5.1. Pattern: Compactor

#### Problem

Your real-time data ingestion pipeline synchronizes events from a streaming broker to an object store. The main goal is to make the data available for batch jobs within at most 10 minutes. Since it's a simple passthrough job, the pipeline is running without any apparent issues. However, after three months, all the batch jobs are suffering from the metadata overhead problem due to too many small files composing the dataset. As a result, they spend 70% of their execution time on listing files to process and only the remaining 30% on processing the data. This has a serious latency and cost impact as you use pay-as-you-go services.

#### Solution

Having small files is a well-known problem in the data engineering space. It has been there since the Hadoop era and is still present even in modern, virtually unlimited, object store-based lakehouses. Storing many small files involves longer listing operations and heavier I/O for opening and closing files. A natural solution to this issue is to store fewer files.

That's what the Compactor pattern does. It addresses the problem by combining multiple smaller files into bigger ones, thus reducing the overall I/O overhead on reading.

<DiagramContainer title="The Small Files Problem">
  <ComparisonTable
    beforeTitle="Before Compaction"
    afterTitle="After Compaction"
    beforeColor={colors.red}
    afterColor={colors.green}
    items={[
      { label: "Files", before: "10,000 small files", after: "100 large files" },
      { label: "Listing Time", before: "70% of execution", after: "5% of execution" },
      { label: "I/O Operations", before: "10,000 open/close", after: "100 open/close" },
      { label: "Processing Time", before: "30% of execution", after: "95% of execution" }
    ]}
  />
</DiagramContainer>

The implementation varies with the technology:

<CardGrid
  columns={3}
  cards={[
    {
      title: "Delta Lake",
      icon: "🔺",
      color: colors.blue,
      items: [
        "OPTIMIZE command",
        "Transactional merge",
        "Columnar format only"
      ]
    },
    {
      title: "Apache Iceberg",
      icon: "🧊",
      color: colors.purple,
      items: [
        "Rewrite data file action",
        "Distributed processing",
        "Columnar format only"
      ]
    },
    {
      title: "Apache Hudi",
      icon: "🏗️",
      color: colors.green,
      items: [
        "Merge-on-read tables",
        "Row + columnar merge",
        "Different approach"
      ]
    }
  ]}
/>

Open table file formats have their dedicated compaction command that often runs a transactional distributed data processing job under the hood to merge smaller files into bigger ones as part of the new commit.

Apache Hudi works differently. A Hudi table can be configured as a merge-on-read (MoR) table where the dataset is written in columnar format and any subsequent changes are written in row format. As this approach favors faster writes, to optimize the read process, the compaction operation in Hudi merges the changes from the row storage with the columnar storage.

The Compactor also works for data stores other than lake-related storage. One of them is Apache Kafka, which is an append-only key-based logs system. In this configuration-based implementation, you only need to configure the compaction frequency. The whole compaction process is later managed, according to the frequency, by the data store. However, in key-based systems, the compaction consists of optimizing the storage by keeping only the most recent entry for a given record key.

#### Consequences

Despite its apparent harmlessness and native support in many data stores, the Compactor can require some significant design effort.

**Cost Versus Performance Trade-offs**

The compaction job is just a regular data processing job that can be compute intensive on big tables. If you consider only this aspect, you should execute it rarely, such as once a day, ideally outside working hours, and outside the pipeline generating the dataset.

On the other hand, rare execution can be problematic for jobs that work on the not yet compacted data as they will simply not take advantage of this optimization technique. You'll then need to choose your strategy and accept that it may not be perfect from both the cost and performance perspectives.

> **Insight**
>
> There is no one-size-fits-all solution. Sometimes, running compaction once a day will be fine as the not compacted dataset may be small enough to not impact consumers. On the other hand, sometimes it won't be acceptable and you'll even prefer to include compaction in the data ingestion process since penalizing consumers will have a bigger impact than impacting the ingestion throughput.

**Consistency**

Remember, compaction simply rewrites already existing data. Consequently, consumers may have difficulties distinguishing the data to use from the data being compacted. For that reason, compaction is much simpler and safer to implement in modern, open table file formats with ACID properties (such as Delta Lake and Apache Iceberg) than in raw file formats (such as JSON and CSV).

**Cleaning**

The compaction job may preserve source files. Consequently, the small files will still be there and will continue impacting metadata actions. For that reason, the compaction job alone won't be enough. You'll have to complete it with a cleaning job to reclaim the space taken up by the already compacted files.

> **Warning**
>
> To reclaim this occupied but not used space, you'll need commands like VACUUM, which are available in modern data storage technologies like Delta Lake, Apache Iceberg, PostgreSQL, and Redshift. But choose your cleaning strategy wisely, because you may not recover your dataset to the version based on these deleted, already compacted files.

#### Examples

Let's start by seeing how the pattern applies to data lakes and lakehouses using open table file formats like Delta Lake.

**Example: Compaction job with Delta Lake**

```python
devices_table = DeltaTable.forPath(spark_session, table_dir)
devices_table.optimize().executeCompaction()
```

The format provides a native compaction capability available from the programmatic API or as a SQL command. The code initializes the path-based Delta table object and calls the data compaction operation. As it only reorganizes the files that are available when the job starts, it's a safe and nonconflicting operation for readers and writers.

**Example: VACUUM in Delta Lake**

```python
devices_table = DeltaTable.forPath(spark_session, table_dir)
devices_table.vacuum()
```

The compaction may require an extra VACUUM step to clean all irrelevant (already compacted) files. This code leverages the Delta table abstraction and calls the `vacuum()` function. The cleaning process applies only to the files that are older than the configured retention threshold. Otherwise, it could lead to a corrupted table state because the vacuum could remove the files that are being written and are not yet committed.

**Example: PostgreSQL VACUUM**

Compaction is also available in other data stores, but compared to the Delta Lake example, it can be a bit misleading. In a transactional PostgreSQL database, compaction uses only the VACUUM command that reclaims space taken by dead tuples, which are the deleted rows not physically removed from the storage layer. You can trigger it with an explicit command.

**Example: Apache Kafka log compaction**

This pattern is also present in Apache Kafka. When you create a topic, you can set the log compaction configuration, which is particularly useful when you write key-based records and each new append is a state update. With compaction enabled, Apache Kafka runs a cleaning process that removes all but the latest versions of each key. The configuration supports properties like:

- `log.cleanup.policy` - Compaction strategy
- `log.cleaner.min.compaction.lag.ms` - Minimum compaction lag
- `log.cleaner.max.compaction.lag.ms` - Maximum compaction lag

Unlike in the Delta Lake example, Kafka's compaction is nondeterministic. You can't expect it to run on a regular schedule, and as a result, it doesn't guarantee that you'll always see a unique record for each key.

---

## 6. Data Readiness

**In plain English:** Data readiness is like waiting for a "ready" signal before you start cooking - you don't want to start making dinner until all the ingredients have been delivered.

**In technical terms:** Data readiness is a mechanism that helps trigger the ingestion process at the most appropriate moment, guaranteeing the ingestion of the complete dataset.

**Why it matters:** Without readiness markers, downstream consumers may start processing incomplete datasets, leading to incorrect analytics, broken ML models, and complaints from teams relying on your data.

### 6.1. Pattern: Readiness Marker

#### Problem

Every hour, you're running a batch job that prepares data in the Silver layer of your Medallion architecture. The dataset has all known data quality issues fixed and is enriched with extra context loaded from your user's database and from an external API service. For these reasons, other teams rely on it to generate ML models and BI dashboards. But there is one big problem: they often complain about incomplete datasets, and they've asked you to implement a mechanism that will notify them - directly or indirectly - when they can start consuming your data.

#### Solution

The issue is particularly visible in logically dependent but physically isolated pipelines maintained by different teams. Because of these isolated workloads, it's not possible for your job to directly trigger downstream pipelines. Instead, you can mark your dataset as ready for processing with the Readiness Marker pattern. Its implementation will depend on the file format and storage organization.

<CardGrid
  columns={2}
  cards={[
    {
      title: "Flag File Approach",
      icon: "🚩",
      color: colors.blue,
      items: [
        "Create _SUCCESS file",
        "Works with raw formats",
        "Explicit marker",
        "Simple to implement"
      ]
    },
    {
      title: "Partition Convention",
      icon: "📅",
      color: colors.purple,
      items: [
        "Next partition signals ready",
        "Works with time-based data",
        "Implicit convention",
        "No extra files needed"
      ]
    }
  ]}
/>

The **first implementation** uses an event to signal the dataset's completeness. Due to the popularity of object stores and distributed file systems in modern data architectures, this approach can be easily implemented with a flag file created after successful data generation. This feature may be natively available in your data processing layer, as with Apache Spark (which writes a `_SUCCESS` file for raw file formats) or a new commit log for Delta Lake. If you can't leverage the data processing layer, you can implement the flag file from the data orchestration layer as a separate task executed after successful data processing.

A **different implementation** applies to partitioned data sources. If you're generating data for time-based tables or locations, the Readiness Marker can be conventional. Your job runs hourly and writes data to hourly based partitions. As a result, the run for 10:00 writes data to partition 10, the run for 11:00 to 11, and so on. Now, if your consumer wants to process partition 10, they must simply wait for your job to work on partition 11.

<DiagramContainer title="Partition-Based Readiness Convention">
  <Column gap="md">
    <Row gap="sm">
      <Box color={colors.green} variant="filled">Partition 09:00</Box>
      <Box color={colors.green} variant="filled">Partition 10:00</Box>
      <Box color={colors.blue} variant="filled">Partition 11:00</Box>
      <Box color={colors.slate} variant="outlined">Partition 12:00</Box>
    </Row>
    <Box color={colors.orange} variant="subtle">
      When partition 11:00 appears, partition 10:00 is ready for consumption
    </Box>
  </Column>
</DiagramContainer>

#### Consequences

The Readiness Marker relies on the pull approach, in which the readers control the data retrieval process. As the implementations are implicit, there are some points to be aware of.

**Lack of Enforcement**

There is no easy way to enforce conventional readiness based on the flag file or the next partition detection. Either way, a consumer may start to consume the dataset while you're generating it.

Because of this implicitness, it's very important to communicate with your consumers and agree upon the conditions that may trigger processing on their side. Additionally, you should clearly explain the risks of not respecting the readiness conventions.

**Reliability for Late Data**

If the partitions are based on the event time, the partition-based implementation will suffer from late data issues. To understand this better, let's imagine that you closed the partition from eight, nine, and ten o'clock. This means your consumers have already processed these partitions. Unfortunately, you've just detected late data for nine o'clock. As your partitions are based on event time, you decide to integrate this data into the partition from nine o'clock. Very probably, your consumers won't be able to do the same as they may consider the partition to be closed.

> **Warning**
>
> You should either consider partitions as immutable parts that will never change once closed or clearly define and share the mutability conditions with your consumers. Besides sharing the partition updates with consumers, you should notify them about new data to eventually process.

#### Examples

For raw files, Apache Spark creates the flag file called `_SUCCESS` out of the box.

**Example: PySpark code generating the _SUCCESS file**

```python
dataset = (spark_session.read.schema('...').json(f'{base_dir}/input'))
dataset.write.mode('overwrite').format('parquet').save('devices-parquet')
```

Whenever you generate Apache Parquet, Apache Avro, or any other supported format, the job will always write the data files first, and only when this operation completes will it generate the marker file.

**Example: FileSensor waiting for the _SUCCESS file**

```python
FileSensor(
    filepath=f'{input_data_file_path}/_SUCCESS',
    mode='reschedule'
    # ...
)
```

As a consumer, you rely on the created `_SUCCESS` file to implement the Readiness Marker. If you use Apache Airflow, you can define this file as a condition in the FileSensor. The `mode='reschedule'` property ensures the sensor task will not occupy the worker slot without interruption. Instead, it will wake up and verify whether the configured file exists.

**Example: Creating a Readiness Marker file as part of the data orchestration process**

```python
@task
def delete_dataset():
    shutil.rmtree(dataset_dir, ignore_errors=True)

@task
def generate_dataset():
    # processing part, omitted for brevity but available on GitHub
    pass

@task
def create_readiness_file():
    with open(f'{dataset_dir}/COMPLETED', 'w') as marker_file:
        marker_file.write('')

delete_dataset() >> generate_dataset() >> create_readiness_file()
```

Apache Airflow also simplifies creating a Readiness Marker file if the latter is not natively available from the data processing job. This code generates the Readiness Marker file called `COMPLETED` in the last task. The `@task` decorator is a convenient way to declare data processing functions in Apache Airflow. The most important thing to keep in mind is that the readiness marker should always be generated as the last step in a pipeline (after performing the last transformation of the dataset).

---

## 7. Event Driven

**In plain English:** Event-driven ingestion is like having a doorbell notification system instead of constantly checking if someone's at the door - you only act when there's actually something to do.

**In technical terms:** Event-driven data ingestion uses push semantics where the producer notifies consumers about data availability, rather than pull semantics where consumers continuously check for new data.

**Why it matters:** When data generation is unpredictable, time-scheduled jobs waste compute resources by running even when there's nothing new to process. Event-driven approaches trigger ingestion only when needed, reducing costs and operational burden.

### 7.1. Pattern: External Trigger

#### Problem

The backend team of your organization releases new features at most once a week, between Monday and Thursday. Each release enriches your reference datasets, where you keep all the features available on your website at any given moment. So far, the refresh job for this dataset has been scheduled for once a day. It has been reloading data even when there were no changes, which led to some wastage of compute resources.

With the goal of reducing costs, you want to change the scheduling mechanism and run the pipeline only when there is something new to process. As the backend team sends a notification event to a central message bus whenever it publishes a new feature, you think about implementing a more event-driven approach.

#### Solution

Unpredictable data generation is often caused by the event-driven nature of the data. This problem can be solved with a time-scheduled job that copies the whole dataset or runs very often to check whether there is something new to process. However, this wastes compute resources and adds an unnecessary operational burden. A better approach is to address this issue with an event-driven External Trigger pattern.

> **Insight**
>
> **Not Only Trigger:** If for whatever reason you don't have a job to trigger, you can run the ingestion process directly in the notification handler. We'll therefore talk about event-driven data ingestion.

The pattern consists of three main actions:

<ProcessFlow
  direction="vertical"
  steps={[
    {
      title: "1. Subscribe",
      description: "Connect to notification channel to receive events",
      icon: "📡",
      color: colors.blue
    },
    {
      title: "2. React",
      description: "Analyze events and decide whether to trigger pipeline",
      icon: "🔍",
      color: colors.purple
    },
    {
      title: "3. Trigger",
      description: "Start ingestion pipeline or job",
      icon: "🚀",
      color: colors.green
    }
  ]}
/>

1. **Subscribing to a notification channel** - Sets up the connection between the external world (event-driven producers) and your pipelines
2. **Reacting to the notifications** - The events handler analyzes the event and decides whether it should trigger a pipeline
3. **Triggering the ingestion pipeline** - The handler starts data ingestion in the data orchestration or data processing layer

<DiagramContainer title="External Trigger Architecture">
  <Row gap="md">
    <Box color={colors.blue} icon="📨">Event Producer</Box>
    <Arrow direction="right" label="Notification" />
    <Box color={colors.purple} icon="⚡">Event Handler</Box>
    <Arrow direction="down" />
  </Row>
  <Row gap="lg">
    <Column gap="sm" align="center">
      <Box color={colors.green} icon="📋">Orchestrator</Box>
      <Box color={colors.slate} variant="subtle" size="sm">Trigger workflow</Box>
    </Column>
    <Column gap="sm" align="center">
      <Box color={colors.orange} icon="⚙️">Processing Layer</Box>
      <Box color={colors.slate} variant="subtle" size="sm">Trigger job directly</Box>
    </Column>
  </Row>
</DiagramContainer>

For the sake of simplicity, one event should trigger one ingestion pipeline. However, it's also possible to start multiple ones, for example, when the same dataset is the input data source for various workloads.

#### Consequences

Even though this event-driven character sounds appealing because it reduces resource waste, it also has some consequences in your data stack.

**Push Versus Pull**

The External Trigger component can implement pull or push semantics. The difference is key in understanding the pattern's impact on your system.

<ComparisonTable
  beforeTitle="Pull-Based Trigger"
  afterTitle="Push-Based Trigger"
  beforeColor={colors.red}
  afterColor={colors.green}
  items={[
    {
      label: "Process Type",
      before: "Long-running job",
      after: "Short-lived instances"
    },
    {
      label: "Resource Usage",
      before: "Constantly consuming",
      after: "Only when needed"
    },
    {
      label: "Efficiency",
      before: "Checks at intervals",
      after: "Reacts to notifications"
    },
    {
      label: "Idle Time",
      before: "High (polling zero messages)",
      after: "None"
    }
  ]}
/>

The pull-based trigger continuously checks whether there are new events to process. Although it's a technically valid implementation, it's not the most optimized since the job may spend most of its time pulling zero messages from the notification source.

A better alternative for this pattern is the push-based trigger, where the data source informs the endpoint(s) about new messages present in the bus. Each notification message starts a new consumer instance which finishes after reacting to the event.

**Execution Context**

There is a risk that the external trigger may become just a ping mechanism that calls a data orchestrator endpoint. Although this simplistic approach is tempting, you should keep in mind that the triggered data ingestion pipeline will need to be maintained like any other. Hence, if you simply trigger it, you may not have enough context to understand why it has been triggered and what it's supposed to process.

> **Insight**
>
> It's important to enrich the triggering call with any appropriate metadata information, including the version of the trigger job, the notification envelope, the processing time, and the event time. They will be useful in day-to-day monitoring, when you will need to investigate the reasons for any eventual failures.

**Error Management**

The events are the key elements here, and without them, you won't be able to trigger any work. For that reason, you should design the trigger for failure with the goal in mind to keep the events whatever happens. Typically, you'll rely here on patterns described in the next chapter, such as the Dead-Letter pattern.

#### Examples

The pattern is easy to implement in the cloud. AWS, Azure, and GCP provide serverless function services that enable this event-driven capability. Therefore, they're great candidates for the triggers. Besides, most of the data orchestrators expose an API that you can use to start a pipeline.

**Example: Externally triggered DAG definition**

```python
with DAG('devices-loader', max_active_runs=5, schedule_interval=None,
         default_args={'depends_on_past': False,}) as dag:
    # the pipeline just copies the file from the trigger,
    # I'm omitting the content for brevity, it's available on GitHub
    pass
```

The DAG has the `schedule_interval` set to `None`. This means the Airflow scheduler will ignore it in the planning stage, and the only way to start the pipeline is with an explicit trigger action.

**Example: AWS Lambda handler to trigger the DAG**

```python
def lambda_handler(event, ctx):
    payload = {
        'event': json.dumps(event),
        'trigger': {
            'function_name': ctx.function_name,
            'function_version': ctx.function_version,
            'lambda_request_id': ctx.aws_request_id
        },
        'file_to_load': (urllib.parse
            .unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')),
        'dag_run_id': f'External-{ctx.aws_request_id}'
    }

    trigger_response = requests.post(
        'http://localhost:8080/api/v1/dags/devices-loader/dagRuns',
        data=json.dumps({'conf': payload}),
        auth=('dedp', 'dedp'),
        headers=headers
    )

    if trigger_response.status_code != 200:
        raise Exception(f"""Couldn't trigger the `devices-loader` DAG.
            {trigger_response} for {payload}""")
    else:
        return True
```

The Lambda function runs whenever a new object appears in the monitored S3 bucket. The function is relatively straightforward. Where is the resiliency part? AWS Lambda implements it at the infrastructure level with failed-event destinations, where the service sends any records from the failed function's invocations. You can also configure the batch size for stream data sources or concurrency level.

> **Warning**
>
> **Explicitness of Code Snippets:** Code snippets, unless specified otherwise, are written with readability in mind. That's one of the reasons why in this example you see hardcoded credentials. As a general rule, hardcoding credentials directly in your code is a bad practice, as they may easily leak. To mitigate this issue, you can use one of the data security design patterns from Chapter 7.

---

## 8. Summary

When you started reading this chapter, you probably considered data ingestion to be a necessary but not technically challenging step. Hopefully, this chapter has proven to you that the opposite is correct.

### Key Takeaways

1. **Data ingestion is critical** — Without proper patterns like the Readiness Marker, you may ingest incomplete data as a customer or get bad press among users if you are the provider

2. **Choose the right pattern** — Full Load for small, slowly changing datasets without change tracking; Incremental Load for continuously growing data; CDC for low-latency requirements with hard delete support

3. **Replication requires care** — Use Passthrough Replicator for exact copies, but switch to Transformation Replicator when PII data needs to be removed or anonymized

4. **Compaction is essential** — Your virtually unlimited lakehouse will become a performance bottleneck pretty fast just because of API calls without the Compactor pattern

5. **Event-driven reduces waste** — The External Trigger pattern addresses unpredictable data generation, reducing resource waste compared to time-scheduled jobs

6. **Not just for ingestion** — Most patterns discussed here are excellent candidates for the extract step in ETL and ELT pipelines, so you may use them in more business-oriented jobs as well

You've learned that even the simple operation of moving data from one place to another comes with significant challenges. The good news is that you now have a list of templates you can apply to ingest data in both pure technical and business contexts. The bad news is that it's just the beginning. After ingesting the data, you will process it, and there, too, things can go wrong. Hopefully, the next chapter will give you some other recipes for building more efficient data engineering systems!

---

**Previous:** [Chapter 1: Introducing Data Engineering Design Patterns](./chapter1) | **Next:** [Chapter 3: Error Management Design Patterns](./chapter3)
