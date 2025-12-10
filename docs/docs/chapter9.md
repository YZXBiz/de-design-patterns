---
sidebar_position: 9
title: "Chapter 9: Data Quality Design Patterns"
description: "Master data quality enforcement, schema consistency, and observability patterns to build trustworthy datasets that producers and consumers can rely on."
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';
import CodeRunner from '@site/src/components/CodeRunner';

# Chapter 9: Data Quality Design Patterns

> **"Trust is an important value of a dataset. Exchanging data is like a mutual transaction, in which you either provide or consume a service (dataset)."**
>
> — The Foundation of Data Engineering

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Quality Enforcement](#2-quality-enforcement)
   - 2.1. [Pattern: Audit-Write-Audit-Publish](#21-pattern-audit-write-audit-publish)
   - 2.2. [Pattern: Constraints Enforcer](#22-pattern-constraints-enforcer)
3. [Schema Consistency](#3-schema-consistency)
   - 3.1. [Pattern: Schema Compatibility Enforcer](#31-pattern-schema-compatibility-enforcer)
   - 3.2. [Pattern: Schema Migrator](#32-pattern-schema-migrator)
4. [Quality Observation](#4-quality-observation)
   - 4.1. [Pattern: Offline Observer](#41-pattern-offline-observer)
   - 4.2. [Pattern: Online Observer](#42-pattern-online-observer)
5. [Summary](#5-summary)

---

## 1. Introduction

**In plain English:** Trust in your data is like trust in a business relationship - once it's broken by poor quality, it's extremely difficult to rebuild. Data quality means ensuring your datasets are complete, accurate, and consistent.

**In technical terms:** Data quality design patterns provide systematic approaches to mitigate incompleteness, inaccuracy, and inconsistency issues through enforcement, schema management, and observability mechanisms.

**Why it matters:** Poor dataset quality leads to wrong insights, broken pipelines, and loss of trust from downstream consumers. The final goal is to make both producers and consumers happy about dataset exchange.

One of the causes of lost trust is poor dataset quality, which means incompleteness, inaccuracy, and/or inconsistency issues. The good news is that these issues are not new, and even though data engineers continue to fight against them, there are design patterns to mitigate data quality issues.

### 🎯 Chapter Organization

This chapter addresses data quality issues through three categories:

<CardGrid
  columns={3}
  cards={[
    {
      title: "Quality Enforcement",
      icon: "🛡️",
      color: colors.blue,
      items: [
        "Audit-Write-Audit-Publish",
        "Constraints Enforcer",
        "Prevent poor quality data"
      ]
    },
    {
      title: "Schema Consistency",
      icon: "📋",
      color: colors.purple,
      items: [
        "Schema Compatibility Enforcer",
        "Schema Migrator",
        "Handle schema evolution"
      ]
    },
    {
      title: "Quality Observation",
      icon: "👁️",
      color: colors.green,
      items: [
        "Offline Observer",
        "Online Observer",
        "Monitor data continuously"
      ]
    }
  ]}
/>

In the first category, you will see how to enforce quality and thus avoid exposing data of poor quality to your downstream consumers. In the next part, you'll see how to address data quality issues at the schema level. In the last part, we're going to see how to guarantee that our enforcement rules today will still be relevant for the data of tomorrow.

---

## 2. Quality Enforcement

**In plain English:** Quality enforcement is like having security checkpoints at airports - they prevent problematic items from getting through before they cause issues downstream.

**In technical terms:** Quality enforcement patterns add validation controls to data flows, similar to assertions in unit tests, to verify datasets meet expectations before exposure to consumers.

**Why it matters:** Ensuring quality means you will avoid sharing an incomplete, inconsistent, or inaccurate dataset, which maintains trust with downstream consumers and prevents costly mistakes.

---

### 2.1. Pattern: Audit-Write-Audit-Publish

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that adds controls (audit steps) to ensure that both input and output datasets meet defined business and technical requirements, such as completeness and exactness. |
| **When to use** | ✓ Data volume drops significantly compared to historical patterns ✓ Need to validate both input data and transformation logic ✓ Want to prevent exposing poor-quality data to downstream consumers |
| **Core problem** | Adds compute cost and may increase streaming latency, while rules coverage may not be 100% complete as datasets evolve over time. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Batch AWAP (Input → Audit → Transform → Audit → Publish) | Processing data in batch windows with clear start/end boundaries |
| Streaming Window-Based | Need to buffer records in time windows and validate on window close |
| Streaming Staging-Based | Want to write to staging layer and run separate audit job before promoting to final output |

> 📁 **Full code**: [chapter-09/01-quality-enforcement](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-09/01-quality-enforcement)

---

The first way to ensure good dataset quality is to add controls to the data flow. This approach is similar to assertions in unit tests that verify whether your code is performing correctly against an expected input.

#### 🎯 Problem

Your daily batch ETL job generates statistics for user visits. The results have not been good for the past week - the number of unique visitors dropped by 50%, and the product team considers this to be an issue. They started a new marketing campaign to bring visitors to the website.

Today, while working on a new feature, you discovered that the unique visitors aggregation is not computed correctly. You informed the product team, which stopped the campaign but asked you to ensure there will be no similar issue in the future.

#### ✅ Solution

Generated data volume that drops by 50% compared with previous days is a perfect use case where the Audit-Write-Audit-Publish pattern can shine.

> **Insight**
>
> The Audit-Write-Audit-Publish (AWAP) pattern is an evolution of the Write-Audit-Publish (WAP) pattern shared by Michelle Ufford at the DataWorks Summit in 2017. Unlike WAP, AWAP completes the validation logic with input data verification to perform usually lightweight validation on the input dataset. The original talk "Whoops, the Numbers Are Wrong! Scaling Data Quality @ Netflix" is still available on YouTube.

The idea behind AWAP is to add controls (audit steps) to ensure that both input and output datasets meet defined business and technical requirements, such as completeness and exactness.

<DiagramContainer title="AWAP Pattern Applied to a Pipeline">
  <ProcessFlow
    direction="horizontal"
    steps={[
      {
        title: "Input Data",
        description: "Raw dataset from producer",
        icon: "📥",
        color: colors.slate
      },
      {
        title: "Audit Input",
        description: "Validate input format, size, schema",
        icon: "🔍",
        color: colors.blue
      },
      {
        title: "Transform",
        description: "Process and transform data",
        icon: "⚙️",
        color: colors.purple
      },
      {
        title: "Audit Output",
        description: "Validate transformed data",
        icon: "✅",
        color: colors.green
      },
      {
        title: "Publish",
        description: "Write to final storage",
        icon: "📤",
        color: colors.cyan
      }
    ]}
  />
</DiagramContainer>

#### 📊 Two Audit Steps

The main difference between the two audit tasks is the audited data store:

**First Audit Job (Input Validation):**
- Analyzes the input data source before transformation
- Limited to fast operations: file format validation, size control, schema checks
- Example: Validate CSV file has expected columns (a, b, c) by analyzing first line
- Avoids reading dataset twice (once in audit, once in transformation)

**Second Audit Job (Output Validation):**
- Validates the transformed data
- Extension of local unit tests running on real dataset
- Focuses on data content and transformation logic
- Example: Verify transformed columns never contain NULL values

> **Warning**
>
> Be careful when considering validation functions to be redundant. NULL validation on input verifies the data provider meets expectations. NULL validation on output ensures your transformation logic doesn't generate missing values. Both validate NULLs, but their intent and scope are different.

If you're concerned about processing the whole dataset many times due to data volume, consider putting the validation in the most exhaustive place - the second audit step, where it detects issues from both input and transformation.

> **Insight**
>
> Unit tests are important for any system relying on software, including data engineering pipelines. However, with regard to data, unit tests are static. You create them at some point in time that may reflect current reality but may not represent what will happen in the future. The audit steps from the AWAP pattern extend unit tests on top of real-world data. Unit tests (which are local) should always be the first line of defense against data quality issues caused by incorrect business logic implementation.

#### 🎯 Audit Outcomes

Validation in audit steps can operate at the records level (validate attributes of particular records) or at the dataset level (verify overall properties like data volume, distinctiveness, or proportion of NULLs). The outcome of audit steps is not always a failed pipeline. Other possible outcomes include:

<CardGrid
  columns={3}
  cards={[
    {
      title: "Data Dispatching",
      icon: "🔀",
      color: colors.orange,
      items: [
        "Promote valid portion",
        "Keep invalid in separate storage",
        "Different from Dead-Letter pattern"
      ]
    },
    {
      title: "Nonblocking Audit",
      icon: "⚠️",
      color: colors.red,
      items: [
        "Promote despite imperfections",
        "Annotate with quality issues",
        "Let consumers decide if acceptable"
      ]
    },
    {
      title: "Pipeline Failure",
      icon: "❌",
      color: colors.slate,
      items: [
        "Stop entire pipeline",
        "Prevent bad data exposure",
        "Require investigation and fix"
      ]
    }
  ]}
/>

#### 🌊 AWAP for Streaming

The description so far makes it sound like AWAP works only for batch pipelines. That's not true - stream workloads can also use it with two different approaches:

<DiagramContainer title="AWAP Pattern for Streaming">
  <Column gap="lg">
    <Group title="Window-Based Approach" color={colors.blue} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.slate} size="md">Input Stream</Box>
        <Arrow direction="right" />
        <Box color={colors.purple} size="md">Processing Window</Box>
        <Arrow direction="right" />
        <Box color={colors.blue} size="md">Audit on Close</Box>
        <Arrow direction="right" />
        <Box color={colors.green} size="md">Apply Strategy</Box>
      </Row>
    </Group>
    <Group title="Staging-Based Approach" color={colors.cyan} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.slate} size="md">Input Stream</Box>
        <Arrow direction="right" />
        <Box color={colors.purple} size="md">Transform</Box>
        <Arrow direction="right" />
        <Box color={colors.orange} size="md">Staging Layer</Box>
        <Arrow direction="right" />
        <Box color={colors.blue} size="md">Audit Job</Box>
        <Arrow direction="right" />
        <Box color={colors.green} size="md">Final Output</Box>
      </Row>
    </Group>
  </Column>
</DiagramContainer>

**Window-Based:** Creates processing time windows directly in the streaming job. Once the window closes, the job runs data audit steps that apply one of the strategies (fail/dispatch/ignore) to the buffered records.

**Staging-Based:** Doesn't modify the data processing logic. Instead, writes transformed records to a staging layer where an audit job runs before promoting the dataset to the final output location.

As you may have noticed, AWAP in a streaming context follows the more classical WAP approach. The first audit step is missing because data is continuously flowing to the system, and in most cases, it should be simpler to validate records after the transformation step.

#### ⚖️ Consequences

The AWAP pattern brings extra safety, but it incurs some costs.

**Compute Cost:**
Depending on the nature of your audit steps, you may have additional compute cost. Metadata-based operations (validating file formats) will be cheap, but operations working on data (row-based validations) will be more expensive. But that's the price you pay to ensure the quality of generated data.

**Rules Coverage:**
If you need to verify values for each incoming row, you'll define a set of business rules. Unfortunately, as datasets may evolve over time, the rules from today might not fully cover a dataset of tomorrow. For that reason, it's better not to consider AWAP-controlled pipelines to be 100% reliable. There is still a risk of forgotten or out-of-date validations that you will spot with Quality Observation patterns.

**Streaming Latency:**
AWAP in a streaming context may add some extra latency. For example, if you want to assert a NULL values distribution within a processing window, the data delivery will be delayed by the window accumulation period.

**An Issue May Not Be an Issue:**
Keep in mind that an issue spotted by the audit steps may not be a real issue. Data is dynamic, and something that appears wrong may turn out to be correct. For example, if you encounter unexpected success (being quoted in social media), you should notice an unexpectedly high number of visits and much more data volume to process. Consequently, it doesn't mean something was wrong on the data producer side.

> **Warning**
>
> You don't need to consider all audit failures to be critical issues. Sometimes, an invalid outcome can only trigger an alert and require further investigation on your part.

#### 💻 Examples

**Batch Pipeline Example (Apache Airflow and PostgreSQL):**

```python
audit_file_to_load = PythonOperator(
    task_id='audit_file_to_load',
    python_callable=local_validate_the_file_before_processing
)

transform_file = PythonOperator(
    task_id='transform_file',
    python_callable=flatten_input_visits_to_csv
)

def local_validate_flatten_visits():
    validate_flatten_visits(get_current_context())

audit_transformed_file = PythonOperator(
    task_id='audit_transformed_file',
    python_callable=local_validate_flatten_visits
)

load_flattened_visits_to_final_table = PostgresOperator(
    task_id='load_flattened_visits_to_final_table',
    sql='/sql/load_file_to_visits_table.sql'
)

(next_partition_sensor >> audit_file_to_load >> transform_file
    >> audit_transformed_file >> load_flattened_visits_to_final_table)
```

The input data audit consists of asserting JSON lines correctness and overall file size:

```python
# Input dataset validation function
if f_size < min_size:
    validation_errors.append(
        f'File is too small. Expected at least {min_size} bytes but got {f_size}')
if lines < min_lines:
    validation_errors.append(
        f'File is too short. Expected at least {min_lines} lines but got {lines}')
if invalid_json_line:
    validation_errors.append(
        f'File contains some invalid JSON lines. The first error found was '
        f'{invalid_json_line}, line {invalid_json_line_number}')

if validation_errors:
    raise Exception('Audit failed for the file:\n-'+"\n-".join(validation_errors))
```

The processed dataset audit function relies on pandas to look for NULL values:

```python
# Processed data validation example
required_columns = ['visit_id', 'event_time', 'user_id', 'page', 'ip', 'login',
    'browser', 'browser_version', 'network_type', 'device_type', 'device_version']
cols_w_nulls = []
visits = pandas.read_csv(partition_file(context, 'csv'), sep=';', header=0)
for validated_column in required_columns:
    if visits[validated_column].isnull().any():
        cols_w_nulls.append(validated_column)

if columns_with_nulls:
    raise Exception('Found nulls in not nullable columns:'+','.join(cols_w_nulls))
```

**Streaming Example (Apache Spark Structured Streaming):**

First, write processed results to a staging table:

```python
visits = (spark_session.readStream
    .option('kafka.bootstrap.servers', 'localhost:9094')
    .option('subscribe', 'visits')
    .option('startingOffsets', 'EARLIEST')
    .option('maxOffsetsPerTrigger', '50')
    .format('kafka').load()
    .selectExpr('CAST(value AS STRING)')
    .select(F.from_json("value", get_visit_event_schema()).alias("visit"), "value")
    .selectExpr('visit.*')
)

write_query = (visits.writeStream
    .trigger(processingTime='15 seconds')
    .option('checkpointLocation', checkpoint_dir)
    .foreachBatch(write_dataset_to_staging_table).start())
```

Next, the second job streams the staging table and performs data quality controls:

```python
visits = (spark_session.readStream.format('delta')
    .option('maxBytesPerTrigger', 20000000)
    .table(get_staging_visits_table())
    .withColumn('is_valid', row_validation_expression)
)

write_query = (visits.writeStream
    .trigger(processingTime='30 seconds')
    .option('checkpointLocation', checkpoint_dir)
    .foreachBatch(audit_dataset_and_write_to_output_table)
    .start())
```

---

### 2.2. Pattern: Constraints Enforcer

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that delegates responsibility for validation to the database or storage format using declarative constraint definitions that automatically reject invalid data. |
| **When to use** | ✓ Want to avoid adding data validation complexity to your pipeline ✓ Need to fail the loading process if there are data quality errors ✓ Can define clear rules (type, nullability, value, integrity constraints) |
| **Core problem** | All-or-nothing semantics mean if any input row fails validation, none are accepted; databases often stop at first error requiring multiple iterations to find all issues. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Database Constraints (Type, Nullability, Value, Integrity) | Using relational databases or table formats like Delta Lake |
| Serialization Format Constraints (Avro, Protobuf with protovalidate) | Working with event streaming or message-based architectures |

> 📁 **Full code**: [chapter-09/01-quality-enforcement](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-09/01-quality-enforcement)

---

The AWAP pattern validates data directly from your data processing pipeline. However, there is an easier way to create trustworthy datasets by delegating those quality controls to the database or storage format, thus relying on a more declarative approach.

#### 🎯 Problem

A batch pipeline processes visits and writes results back to a table. Even though it has been running without issues for several months, you're now getting random NULL values for several required fields. The data processing job is already complex, and you want to avoid adding data validation complexity to it. You're looking for an alternative approach that will fail the loading process if there are any data quality errors.

#### ✅ Solution

Delegating responsibility for validation to the database is what the Constraints Enforcer pattern is responsible for.

**In plain English:** The Constraints Enforcer is like having a bouncer at a club who checks IDs - the database itself enforces rules, so you don't have to write validation code in your pipeline.

**In technical terms:** The pattern delegates data validation to the storage layer (database or file format) using declarative constraint definitions that automatically reject invalid data.

**Why it matters:** This approach is simpler than writing data validation logic in your pipeline, provides clear contracts to data producers and consumers, and ensures consistency across all data writers.

#### 📋 Implementation Steps

The implementation starts by identifying the attributes that should have constraint rules assigned to them. It's a very business-specific step where rules can be driven by your product team or legislation. For example, an orders dataset will require attributes like order amount and buyer's billing address.

Once you identify the attributes, it's time to assign the constraints. They can be from different categories:

<CardGrid
  columns={2}
  cards={[
    {
      title: "Type Constraints",
      icon: "🔢",
      color: colors.blue,
      items: [
        "All values same type",
        "Simplifies processing",
        "Part of dataset schema",
        "Backbone of Schema Consistency"
      ]
    },
    {
      title: "Nullability Constraints",
      icon: "⭕",
      color: colors.purple,
      items: [
        "Define required vs optional",
        "Reject rows with missing values",
        "Communicate operations to add",
        "Filter nullable columns"
      ]
    },
    {
      title: "Value Constraints",
      icon: "📐",
      color: colors.green,
      items: [
        "Allowed values or expressions",
        "Comparison operators",
        "Example: x <= NOW()",
        "Example: x BETWEEN 1901 AND 2000"
      ]
    },
    {
      title: "Integrity Constraints",
      icon: "🔗",
      color: colors.orange,
      items: [
        "Part of transactional databases",
        "Reference values in other tables",
        "Foreign key relationships",
        "Used with Normalizer pattern"
      ]
    }
  ]}
/>

Although this implementation is commonly present in databases, you can encounter it while working with file formats. For example, Delta Lake includes a CHECK operator that will verify each value against the specified condition. Also, serialization formats such as Apache Avro and Apache Protobuf implement the Constraints Enforcer pattern natively.

The Constraints Enforcer pattern is **informative** for consumers (defines the dataset's shape and possible values) and **interactive** for producers (prevents adding records without passing validation controls).

#### ⚖️ Consequences

Using the Constraints Enforcer pattern is a definitive way to ensure good data quality, but it has some drawbacks.

**All-or-Nothing Semantics:**
Most constraints defined at the database level follow transactional all-or-nothing semantics. If any input rows don't respect the validation rules, none of the rows will be accepted. Also, databases often stop at the first encountered error. If you generate a dataset with multiple issues, you'll need to go back and forth several times to discover all problems. To mitigate this, you could implement validation rules on the data producer side - but you'd lose the informative and interactive advantages.

**Data Producer Shift:**
The pattern is data producer-oriented since it exposes constraints to the data writer. However, different consumers may have different data expectations. For example, a nullable field in the database may be required for some consumers, and you may still need to implement data validation or filtering logic on top of an already constrained dataset.

**Constraints Coverage:**
It's not always possible to cover all validation rules. That's especially apparent with table file formats that may not cover integrity constraints. The constraints from the AWAP pattern are more flexible - the single limitation is your programming language. Consequently, you may need to complete database constraints with ones defined in your data processing job.

#### 💻 Examples

**Delta Lake Constraints:**

Delta Lake supports type constraints, nullability constraints, and value constraints:

```sql
CREATE TABLE default.visits (
    visit_id STRING NOT NULL,
    event_time TIMESTAMP NOT NULL
) USING delta;

ALTER TABLE default.visits ADD CONSTRAINT
    event_time_not_in_the_future CHECK (event_time < NOW() + INTERVAL "1 SECOND")
```

From now on, if any inserted rows violate the specified rules, you will get a `DELTA_VIOLATE_CONSTRAINT_WITH_VALUES` or `DELTA_NOT_NULL_CONSTRAINT_VIOLATED` error. None of the records added in the transaction will be written to the table.

**Protobuf with protovalidate:**

Another place where you can use the Constraints Enforcer pattern is in serialization file formats like Protobuf. The library implements type constraints natively, and if you install protovalidate, you can extend the scope with value constraints.

```protobuf
message Visit {
    string visit_id = 1 [(buf.validate.field).string.min_len = 5];
    google.protobuf.Timestamp event_time = 2 [
        (buf.validate.field).timestamp.lt_now = true,
        (buf.validate.field).required = true];
    string user_id = 3 [(buf.validate.field).required = true];
    string page = 4 [(buf.validate.field).cel = {
        message: "Page cannot end with an html extension"
        expression: "this.endsWith('html') == false"
    }, (buf.validate.field).required = true];
}
```

Now, if you call `validate(...)` on any visit class instance and break one of the rules, you will get a ValidationError:

```python
Traceback (most recent call last):
  File "...visits_generator.py", line 39, in <module>
    validate(visit_to_send)
  File "...protovalidate/validator.py", line 61, in validate
    raise ValidationError(msg, violations)
protovalidate.validator.ValidationError: invalid Visit
```

---

## 3. Schema Consistency

**In plain English:** Schema consistency is like ensuring everyone speaks the same language with the same grammar rules - when the structure of your data changes unexpectedly, communication breaks down.

**In technical terms:** Schema consistency patterns manage schema evolution to prevent breaking changes that cause downstream pipeline failures while enabling controlled schema modifications.

**Why it matters:** Schema constraints solve data consistency problems. However, schemas have a special place in data engineering that is much more complex than simply defining field types. Producers can generate data without issues until they modify the schema, potentially causing fatal pipeline failures and loss of trust.

The schema constraints you discovered with the Constraints Enforcer pattern solve the data consistency problem. However, schemas are dynamic - they can change over time - and these changes need to be managed carefully.

---

### 3.1. Pattern: Schema Compatibility Enforcer

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that enforces schema evolution rules through external services, implicit validation, or event-driven mechanisms to prevent incompatible changes that would break downstream consumers. |
| **When to use** | ✓ Upstream team removed fields causing your application to fail ✓ Need to prevent any schema-breaking changes ✓ Multiple consumers depend on schema stability |
| **Core problem** | Schema management adds extra overhead to data generation as producers must validate records against the most recent schema version; schema evolution becomes harder as changes must agree with compatibility level. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| External Service/Library (Schema Registry, Avro SchemaValidator) | Using Apache Kafka or need centralized schema versioning and validation |
| Implicit with Inserts (Table constraints) | Using table file formats or relational databases with defined constraints |
| Event Driven for DDL (PostgreSQL/SQL Server triggers) | Need fine-grained control over DDL operations like DROP/RENAME COLUMN |

> 📁 **Full code**: [chapter-09/02-schema-consistency](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-09/02-schema-consistency)

---

Datasets are dynamic because their values can change over time, and the Constraints Enforcer pattern validates these evolved entries against predefined rules. But schemas can also have this validation.

#### 🎯 Problem

You're running a sessionization job implemented with the Stateful Sessionizer pattern. It ran great for months, but then the team generating your input data made several changes, and the job has failed many times in the past month. It turns out the new team removed fields used by your application, thinking they were obsolete.

After discussing the issue with your new colleagues, you've asked them to build a solution to avoid any schema-breaking changes.

#### ✅ Solution

To ensure that you as the data producer don't introduce any breaking changes, you can use the Schema Compatibility Enforcer pattern.

**In plain English:** Schema Compatibility Enforcer is like having building codes that ensure renovations don't make a structure unsafe - it validates schema changes against compatibility rules before allowing them.

**In technical terms:** The pattern enforces schema evolution rules through external services, implicit validation, or event-driven mechanisms to prevent incompatible changes that would break downstream consumers.

**Why it matters:** Without schema compatibility enforcement, a well-meaning schema change by one team can break multiple downstream pipelines, causing production outages and data quality issues.

#### 🔧 Enforcement Modes

Depending on your data store, you'll use one of three available schema compatibility enforcement modes:

<DiagramContainer title="Schema Compatibility Mode Workflows">
  <Column gap="lg">
    <Group title="External Service or Library" color={colors.blue} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.purple} size="md">Producer/Consumer</Box>
        <Arrow direction="right" label="validate" />
        <Box color={colors.blue} size="md">Schema Registry API</Box>
        <Arrow direction="right" label="approve/reject" />
        <Box color={colors.green} size="md">Versioned Schema</Box>
      </Row>
      <Box color={colors.slate} size="sm" variant="subtle">Example: Apache Kafka Schema Registry, Apache Avro SchemaValidator</Box>
    </Group>
    <Group title="Implicit with Inserts" color={colors.purple} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.orange} size="md">CREATE TABLE</Box>
        <Arrow direction="right" label="defines" />
        <Box color={colors.purple} size="md">Constraints</Box>
        <Arrow direction="right" label="validates" />
        <Box color={colors.green} size="md">INSERT Operations</Box>
      </Row>
      <Box color={colors.slate} size="sm" variant="subtle">Example: Table file formats, relational databases</Box>
    </Group>
    <Group title="Event Driven for DDL" color={colors.cyan} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.red} size="md">DDL Operation</Box>
        <Arrow direction="right" label="triggers" />
        <Box color={colors.cyan} size="md">Event Trigger Function</Box>
        <Arrow direction="right" label="validates" />
        <Box color={colors.green} size="md">Commit or Rollback</Box>
      </Row>
      <Box color={colors.slate} size="sm" variant="subtle">Example: PostgreSQL, SQL Server event triggers</Box>
    </Group>
  </Column>
</DiagramContainer>

**External Service or Library:**
Apache Kafka's Schema Registry exposes an API that producers and consumers communicate with. Schema Registry versions each schema and validates schema changes against configured compatibility rules. Alternatively, you could use a library like Apache Avro's SchemaValidator class to validate that a schema doesn't have incompatible changes.

**Implicit with Inserts:**
Table file formats or relational databases use this enforcement mode. When you create a new table, you define constraints (nullability, type, accepted range). You implicitly set the compatibility mode that prevents any record not respecting constraints from being written. However, there's no way to define an explicit schema compatibility mode.

**Event Driven for DDL:**
This approach extends the implicit mode. In some relational databases (PostgreSQL, SQL Server), you can add event triggers that run SQL functions before committing DDL operations like DROP COLUMN or RENAME COLUMN. The function logic can include your schema enforcement rules and roll back the operation if a user tries to perform an incompatible change. Alternatively, prevent all schema modifications by not granting ALTER TABLE permission to a user.

#### 📐 Compatibility Modes

Let's complete this implementation with an analysis of various compatibility modes you can define for your schemas (if supported by your data store). The schema compatibility mode informs downstream consumers of what evolution they should be ready for.

One of the most common compatibility scenarios involves **nontransitive rules** in which two consecutive schema versions (such as version and version+1 or version and version-1) must remain compatible.

<ComparisonTable
  beforeTitle="Without Transitivity"
  afterTitle="With Transitivity"
  beforeColor={colors.blue}
  afterColor={colors.purple}
  items={[
    {
      label: "Versions Checked",
      before: "Current and previous/next only",
      after: "All past/future versions"
    },
    {
      label: "Flexibility",
      before: "More flexible evolution",
      after: "Stricter evolution rules"
    },
    {
      label: "Allowed Actions",
      before: "Same as transitive",
      after: "Same as nontransitive"
    },
    {
      label: "Example",
      before: "v2 compatible with v1",
      after: "v2 compatible with v0, v1"
    }
  ]}
/>

The available compatibility modes are:

**Backward Compatibility:**
A consumer using a new schema can still read data generated with an old schema. For example, if a new schema has a new optional field, the added field will simply be missing in records generated with the old schema.

**Forward Compatibility:**
A consumer with an old schema can read data generated with a new schema. For example, if an optional field in an old schema has been deleted from a new schema, the removed optional attribute will be missing from records produced with the new schema. The consumer will see the field's value is empty, but emptiness is already part of the contract as the field was marked as optional.

**Full Compatibility:**
This mode mixes backward and forward compatibilities, so consumers with a new schema can read data generated with a previous schema, and consumers using an old schema can still access data generated with a new schema.

#### 📊 Compatibility Actions Summary

<DiagramContainer title="Schema Compatibility Modes">
  <Column gap="md">
    <Group title="Backward Compatibility" color={colors.blue} direction="column">
      <Box color={colors.blue} size="sm" variant="subtle">Allowed Actions: Delete field, Add optional field</Box>
      <Box color={colors.slate} size="sm" variant="outlined">Consumers with newer version can read data produced with older version</Box>
    </Group>
    <Group title="Forward Compatibility" color={colors.purple} direction="column">
      <Box color={colors.purple} size="sm" variant="subtle">Allowed Actions: Add field, Delete optional field</Box>
      <Box color={colors.slate} size="sm" variant="outlined">Consumers with older version can read data produced with newer version</Box>
    </Group>
    <Group title="Full Compatibility" color={colors.green} direction="column">
      <Box color={colors.green} size="sm" variant="subtle">Allowed Actions: Add optional field, Delete optional field</Box>
      <Box color={colors.slate} size="sm" variant="outlined">Both backward and forward compatibility guaranteed</Box>
    </Group>
  </Column>
</DiagramContainer>

The compatibilities can also be **transitive**. This means that compatibility between all past (backward) and future (forward) schemas must be guaranteed.

> **Insight**
>
> The transitive and nontransitive allowed actions are the same. That may be confusing, so let's examine an example. For transitive backward compatibility, if you start with schema v0 (order_id LONG REQUIRED), add optional amount in v1 (amount DOUBLE DEFAULT 0.0), then make it required in v2 (amount DOUBLE REQUIRED), the last change is NOT compatible between v0 and v2. A consumer using v2 can't read data produced by v0. However, from a nontransitivity standpoint, the evolution looks fine - the consumer using v2 can read schema produced in v1.

#### ⚖️ Consequences

Even though benefits outweigh risks, there are some points to keep in mind.

**Interaction Overhead:**
Schema management, particularly via an external schema registry component, adds extra overhead to data generation. The producer must validate records against the most recent schema version.

**Schema Evolution:**
Schema evolution will be harder with the Schema Compatibility Enforcer pattern. Any schema change must agree with the schema compatibility level defined for the dataset. This may lead to situations where renaming a field means adding a new field and deprecating the previous one. However, that's the price you pay for having more reliable data.

#### 💻 Examples

**Apache Kafka Schema Registry:**

Apache Kafka's Schema Registry made schema compatibility enforcement popular among data engineers. To start, define the schema alongside its compatibility mode. Here we're setting the schema to be forward compatible:

```json
{
  "type": "record",
  "namespace": "com.waitingforcode.model",
  "name": "Visit",
  "fields": [
    {"name": "visit_id", "type": "string"},
    {"name": "event_time", "type": "int", "logicalType": "time"}
  ]
}
```

Let's say a new producer wants to generate a record without the visit_id field. Since writing a record now involves validating its schema against Schema Registry, the operation will fail:

```python
confluent_kafka.avro.error.ClientError: Incompatible Avro schema:409 message:
  {'error_code': 409, 'message': 'Schema being registered is incompatible with
  an earlier schema for subject "visits_forward-value",
  details: [{errorType:'READER_FIELD_MISSING_DEFAULT_VALUE',
  description:'The field \'visit_id\' at path \'/fields/0\' in
  the old schema has no default value and is missing in the new schema',
  ...
```

**Delta Lake Implicit Enforcement:**

The table has been created with these columns:

```
root
|-- visit_id: string (nullable = true)
|-- page: string (nullable = true)
|-- event_time: long (nullable = true)
```

Now, let's imagine a producer adds an extra column called ad_id. Since Delta Lake doesn't modify the schema without your permission, it will detect this change as incompatible and respond with an exception:

```python
pyspark.errors.exceptions.captured.AnalysisException: A schema mismatch detected when
writing to the Delta table
...

Table schema:
root
-- visit_id: string (nullable = true)
-- page: string (nullable = true)

Data schema:
root
-- visit_id: string (nullable = true)
-- page: string (nullable = true)
-- ad_id: string (nullable = true)
```

---

### 3.2. Pattern: Schema Migrator

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that enables breaking schema changes through a grace period where both old and new schema versions coexist, allowing consumers to migrate at their own pace before the old schema is removed. |
| **When to use** | ✓ Domain-related fields are dispersed across messages making understanding difficult ✓ Need to improve schema organization without breaking compatibility ✓ Want to rename fields or change types while giving consumers time to adapt |
| **Core problem** | Size impact as both old and new fields coexist during grace period, increasing storage space, network transfer, and I/O costs; some data formats discourage having hundreds of fields. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Rename Migration (Add new field → Grace period → Remove old field) | Field names are wrong or difficult to understand and need improvement |
| Type Change Migration (Add retyped field → Grace period → Remove old) | Need to organize schema better or optimize for processing (e.g., text to epoch timestamp) |
| Removal Migration (Deprecate field → Grace period → Remove) | Have 100% guarantee no consumers use the field or can provide substitution |

> 📁 **Full code**: [chapter-09/02-schema-consistency](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-09/02-schema-consistency)

---

Ensuring schema correctness prevents producers from making incompatible changes and prevents consumers from being interrupted. However, one schema-related problem remains: how to keep consumers safe while giving them the ability to perform breaking schema changes, such as field type evolution and renaming?

#### 🎯 Problem

You're looking to improve the structure of visit events your jobs are generating downstream. From day one, you wanted to be user friendly and have been adding new fields without bothering your consumers. As a result, some domain-related fields are dispersed across an entire message that sometimes has up to 60 attributes, which is too many for most uses and makes understanding the domain very challenging.

Many consumers are complaining about difficulties related to processing and understanding the complicated domain. Ideally, they would like to have related attributes grouped in the same entity. For example, user-related attributes like login, email address, and age should be part of a single attribute called user.

You don't want to radically change the existing schema because that would break compatibility. However, you do want to improve the organization of attributes while giving consumers time to migrate to the new format.

#### ✅ Solution

You can't solve the problem with the Schema Compatibility Enforcer pattern as it only controls the types of changes that can be made. The solution relies on the Schema Migrator design pattern that enables schema evolution.

**In plain English:** Schema Migrator is like a building renovation where you keep the old entrance open while building the new one, giving tenants time to adjust before closing the old entrance.

**In technical terms:** The pattern enables breaking schema changes through a grace period where both old and new schema versions coexist, allowing consumers to migrate at their own pace before the old schema is removed.

**Why it matters:** This pattern allows necessary schema improvements without breaking downstream consumers, balancing the need for evolution with system stability.

> **Warning**
>
> The Schema Migrator requires the schema compatibility to NOT be transitive. Otherwise, no field removal or renaming would be possible, as transitive compatibility guarantees consistency across all versions.

#### 🔄 Evolution Scenarios

The first step consists of identifying the evolution. Three scenarios are possible:

<ProcessFlow
  direction="vertical"
  steps={[
    {
      title: "Rename",
      description: "Attribute name is wrong or difficult to understand",
      icon: "📝",
      color: colors.blue
    },
    {
      title: "Type Change",
      description: "Better organization or optimization (e.g., text to epoch timestamp)",
      icon: "🔄",
      color: colors.purple
    },
    {
      title: "Removal",
      description: "Easy if no downstream consumers; otherwise need substitution",
      icon: "🗑️",
      color: colors.red
    }
  ]}
/>

**For Rename and Type Change:**

<DiagramContainer title="Schema Migration Workflow">
  <ProcessFlow
    direction="horizontal"
    steps={[
      {
        title: "Step 1",
        description: "Create new field with renamed/retyped attribute",
        icon: "1️⃣",
        color: colors.blue
      },
      {
        title: "Step 2",
        description: "Agree on transition period with consumers",
        icon: "2️⃣",
        color: colors.purple
      },
      {
        title: "Step 3",
        description: "Both old and new attributes coexist",
        icon: "3️⃣",
        color: colors.orange
      },
      {
        title: "Step 4",
        description: "After deadline, remove old attribute",
        icon: "4️⃣",
        color: colors.green
      }
    ]}
  />
</DiagramContainer>

Let's focus first on the most challenging scenarios: rename and type change. In both cases, you need to start by creating the new field with the renamed or retyped attribute. Next, agree with your consumers on the transition time. During that period, they will receive both the previous and the new attributes. Only after reaching the deadline can you create a new version of the schema that contains only the modified version of the attribute.

> **Insight**
>
> To detect whether an attribute is used by your consumers or not, you can rely on the Fine-Grained Tracker pattern in Chapter 10 (Data Lineage).

**For Removal:**
The removal scenario is slightly different as it requires agreeing with consumers on the field removal period. Once the deadline passes, you can create a new schema version without the deleted property.

#### ⚖️ Consequences

The Schema Migrator pattern relies on a grace period for schema migration. During that time, the old schema is still valid and can be processed by consumers. This impacts the data size.

**Size Impact:**
This is a natural consequence of the Schema Migrator, which provides safety mechanisms for schema migration but also incurs costs in storage space, network transfer, and I/O as there is more data to save.

For some data formats, having many fields is officially discouraged. For example, Protobuf, in its "Proto Best Practices," warns against using hundreds of fields because each, even unpopulated ones, takes up at least 65 bytes. The overall size of Protobuf-generated builders can reach compilation limits of some languages like Java.

Size also impacts the metadata and statistics layer. At the time of this writing, Delta Lake collects statistics on the first 32 columns by default. Although you can change that, it may impact writing time.

**Impossible Removal:**
The Schema Migrator pattern has implementation limits in the field removal scenario. If a field is used by one of your consumers, removing it will not be possible if you cannot provide an alternative attribute.

#### 💻 Examples

Since the schema migration workflow is the same for various technologies, let's focus on one data format and understand what happens if schema migration doesn't follow the Schema Migrator pattern.

The consumer in our example extracts visits of connected users to a dedicated table:

```sql
INSERT INTO dedp.connected_users_visits
  SELECT visit_id, event_time, user_id, page, ip, login, from_page
  FROM dedp.visits
  WHERE is_connected = true AND from_page IS NOT NULL;
```

Now, let's suppose we realized that the from_page column is poorly named and a better name would be referral. The worst thing we could do would be to run the rename operation directly with:

```sql
ALTER TABLE dedp.visits RENAME COLUMN from_page TO referral
```

This would break consumers' workload. The consumer would not be able to see new data as its query will fail first:

```
ERROR:  column "from_page" does not exist
LINE 2:     SELECT visit_id, event_time, user_id, ...
```

To avoid this issue, you should migrate the rename by creating a new column first:

```sql
ALTER TABLE dedp.visits ADD COLUMN referral VARCHAR(25) NOT NULL
```

You can remove the previous column only once your consumers adapt their workloads.

Since a similar workflow exists for Protobuf and Delta Lake, you can find examples in the GitHub repo.

---

## 4. Quality Observation

**In plain English:** Quality observation is like having security cameras that continuously monitor your premises - they don't prevent problems, but they help you detect and respond to issues quickly.

**In technical terms:** Observation patterns monitor dataset properties over time to detect new data quality issues, ensuring enforcement rules remain relevant as data evolves.

**Why it matters:** Datasets are dynamic and change over time. The constraint rules you define today may not be valid tomorrow. It's important to observe what's going on with datasets and be ready to adapt existing rules or add new constraints.

Remember, datasets are dynamic. They change, and the constraint rules you define today may not be valid tomorrow. That's why it's important to observe what's going on with datasets and be ready to adapt the existing rules or add new constraints.

---

### 4.1. Pattern: Offline Observer

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that implements a separate data observability job that runs independently from the data generation pipeline, analyzing processed records and enhancing the monitoring layer with insights about data quality trends. |
| **When to use** | ✓ Dataset is fully structured with business rules correctly enforced ✓ Monitoring layer shouldn't block your main pipeline ✓ Want to monitor properties like distribution of values and number of nulls per column |
| **Core problem** | Insight may come too late since observation runs on any schedule, potentially much later than data generation; all downstream consumers could already have processed a dataset with new data quality issues. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Batch Offline Observer (Separate Airflow pipeline) | Running batch jobs with different schedules for observation vs generation |
| Streaming Offline Observer (Separate Spark job) | Want to generate data profiles and detect lag without impacting main streaming job |

> 📁 **Full code**: [chapter-09/03-quality-observation](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-09/03-quality-observation)

---

Observation patterns can be organized according to their place in the data pipeline. The first type of pattern lives as a separate observation component that doesn't interfere with the data processing workflow.

#### 🎯 Problem

You started a new data pipeline this month and haven't encountered many data quality issues. The dataset is fully structured, and all business rules are correctly enforced by quality enforcement patterns. However, from your previous project, you know this won't last as the upstream dataset will evolve in the coming months. You want to monitor dataset properties, such as distribution of values and number of nulls per column. Since everything is fine at the moment, this monitoring layer shouldn't block your main pipeline.

#### ✅ Solution

In a scenario when monitoring shouldn't block the processing workflow, it's best to opt for the Offline Observer pattern.

**In plain English:** The Offline Observer is like a night security guard who inspects the building after business hours - they don't interfere with daily operations but provide valuable insights about what happened.

**In technical terms:** The pattern implements a separate data observability job that runs independently from the data generation pipeline, analyzing processed records and enhancing the monitoring layer with insights about data quality trends.

**Why it matters:** By decorrelating observation from data generation, you avoid impacting production resources while still gaining visibility into data quality trends over time.

The implementation consists of creating a data observability job that will analyze the processed records and enhance the existing monitoring layer with extra insight. The insight will depend on the business context, but can include properties like distribution of values, number of nulls in nullable fields, new but not processed fields in the input dataset, etc. That way, you can store these parameters and spot any data quality issues over time.

<DiagramContainer title="Offline Observer Pattern">
  <Column gap="lg">
    <Row gap="md" wrap={true}>
      <Box color={colors.blue} size="md">Data Generator</Box>
      <Arrow direction="right" />
      <Box color={colors.green} size="md">Processed Data</Box>
    </Row>
    <Row gap="md" wrap={true}>
      <Box color={colors.orange} size="md">Observability Job</Box>
      <Arrow direction="up" label="reads" />
    </Row>
    <Row gap="md" wrap={true}>
      <Box color={colors.orange} size="md">Observability Job</Box>
      <Arrow direction="right" />
      <Box color={colors.purple} size="md">Monitoring Layer</Box>
    </Row>
  </Column>
</DiagramContainer>

The data observability job doesn't impact the data generation process. It runs independently and could even be executed on a completely different schedule. For example, assuming all your data generators run throughout the day, you may want to schedule all observability jobs to run at night to avoid resource concurrency issues.

> **Insight**
>
> Observability is NOT the same as auditing. An audit validates the dataset and is a blocking operation (whenever it detects issues, it blocks the pipeline). Observability is a nonblocking approach that monitors datasets (it helps detect issues but will not prevent the pipeline from moving on).

#### ⚖️ Consequences

Decorrelating data generation from data observation is good as it doesn't impact production resources. Unfortunately, there is another side of the coin.

**Time Accuracy:**
Since an offline observation job can run on any schedule, including much later than the data generator, it may not happen on a timely basis. In other words, the insight may come too late since all downstream consumers could already have processed a dataset with new data quality issues.

**Compute Resources:**
As the data observation job will be running on the side, you may be tempted to schedule it less frequently than the data generation job. For example, for hourly batch processing, you may execute the data observation job only once every 24 hours. Although this approach is valid, you need to be aware that it may require more compute resources as, instead of dealing with hourly data changes, you'll have to process 24 hours at once.

Eventually, you could consider sampling the observed dataset and therefore using only parts of it. Unfortunately, by extracting a subset to observe, you may miss some interesting observations.

#### 💻 Examples

**Batch Pipeline (Apache Airflow):**

The first example is an Apache Airflow pipeline that runs on a different schedule than the data generation pipeline, asserts the quality of the generated dataset, and writes statistics to a monitoring layer:

```python
wait_for_new_data = SqlSensor(...)
record_new_observation_state = PostgresOperator(...)
insert_new_observations = PostgresOperator(...)

wait_for_new_data >> record_new_observation_state >> insert_new_observations
```

Whenever there is new data to process, the observation job records a new observation state that includes IDs of the first and last processed rows. This operation is required for idempotency to guarantee that in case of any row changes in the observed table, the analysis scope will be the same and consistent:

```sql
-- State recording query
INSERT INTO dedp.visits_monitoring_state (execution_time, first_row_id, last_row_id)
  SELECT
    '{{ execution_date }}' AS execution_time,
    MIN(id) AS first_row_id,
    MAX(id) AS last_row_id
  FROM dedp.visits_output
  WHERE id > COALESCE(
    (SELECT last_row_id FROM dedp.visits_monitoring_state
     WHERE execution_time = '{{ prev_execution_date }}'::TIMESTAMP),
    0
  )
```

Later, the Offline Observer pipeline generates observations by performing aggregations on top of the selected first and last row IDs:

```sql
-- Data observation query
INSERT INTO dedp.visits_monitoring(
  execution_time, all_rows, invalid_event_time,
  invalid_user_id, invalid_page, invalid_context
)
SELECT
  '{{ execution_date }}' AS execution_time,
  COUNT(*) AS all_rows,
  -- ...
  SUM(CASE WHEN context IS NULL THEN 1 ELSE 0 END) AS invalid_context
FROM dedp.visits_output
WHERE id BETWEEN
  (SELECT first_row_id FROM dedp.visits_monitoring_state
   WHERE execution_time = '{{ execution_date }}')
  AND
  (SELECT last_row_id FROM dedp.visits_monitoring_state
   WHERE execution_time = '{{ execution_date }}');
```

**Streaming Pipeline (Apache Spark):**

Implementing the Offline Observer is also possible for streaming pipelines. There is a separate job running on top of processed data generating observations. In this example, we analyze data processing lag and data quality metrics:

```python
visits_to_observe = (input_data_stream
  .selectExpr('CAST(value AS STRING)')
  .select(functions.from_json(functions.col('value'), visit_schema).alias('visit'))
  .selectExpr('visit.*')
  .select('visit_id', 'event_time', 'user_id', 'page', 'context.referral', ...)
)

query = (visits_to_observe.writeStream
  .foreachBatch(generate_and_write_observations)
  .option('checkpointLocation', checkpoint_location)
  .start())
```

All observation logic is present in the `generate_and_write_observations` function. It executes the same data observation query as in the Apache Airflow version, then performs an extra operation and generates an HTML data profile report with the help of the ydata-profiling library:

```python
def generate_profile_html_report(visits_dataframe: DataFrame, batch_version: int):
    profile = ProfileReport(visits_dataframe, minimal=True)
    profile.to_file(f'{base_dir}/profile_{batch_version}.html')
```

The generated HTML page describes characteristics of the observed dataset that you can use later to add, modify, or delete existing data quality rules in the enforcement step.

For lag detection, the function compares the most recently committed offset by the data generation job from the checkpoint location with the most recent offset present in the input topic:

```python
def get_last_offsets_per_partition(self) -> Dict[str, int]:
    last_processed_offsets = self._read_last_processed_offsets()
    last_available_offsets = self._read_last_available_offsets()

    offsets_lag = {}
    for partition, offset in last_available_offsets.items():
        lag = offset - last_processed_offsets[partition]
        offsets_lag[partition] = lag
    return offsets_lag
```

---

### 4.2. Pattern: Online Observer

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that integrates data observation into the data generation pipeline as an intrinsic component, producing insights immediately after data generation to enable rapid issue detection and resolution. |
| **When to use** | ✓ Offline Observer discovered issues too late (e.g., once per week) ✓ Want to detect problems before downstream consumers do ✓ Need near-real-time visibility into data quality issues |
| **Core problem** | Local Sequencer approach adds extra step delaying pipeline completion; Parallel Split approach risks observing partially valid dataset (e.g., database missing date time values due to format issues). |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Batch Local Sequencer (Transform → Load → Observe) | Want to observe dataset exposed to consumers; accept extra delay |
| Batch Parallel Split (Transform → [Load \|\| Observe]) | Need parallelism but observe processed (not exposed) dataset |
| Streaming Integrated (Transform + Observe in same job) | Working with streaming pipelines; can sample dataset to mitigate observation overhead |

> 📁 **Full code**: [chapter-09/03-quality-observation](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-09/03-quality-observation)

---

If latency between data processing and data observation via the Offline Observer pattern is an issue, you can opt for a more real-time alternative pattern, which is the Online Observer.

#### 🎯 Problem

Last week, your data analytics colleagues complained about an unexpected format in the zip code field. It turns out there is data regression in the upstream dataset, and you couldn't prevent it with the data trust rules in place. Your Offline Observer did discover the issue, but since it runs once per week, you couldn't detect the problem before your users did. In the future, you would like to avoid this kind of problem, so you want to be able to keep your consumers from finding out about data quality issues and fix them sooner than after one week.

#### ✅ Solution

The problem we've presented is a perfect example of the Offline Observer's limitations. Thankfully, overcoming it is relatively simple with the opposite pattern, which is called the Online Observer pattern.

**In plain English:** The Online Observer is like a quality control inspector on an assembly line - they check products as they're being produced, catching issues immediately before they reach customers.

**In technical terms:** The pattern integrates data observation into the data generation pipeline as an intrinsic component, producing insights immediately after data generation to enable rapid issue detection and resolution.

**Why it matters:** By providing near-real-time visibility into data quality issues, you can detect and fix problems before downstream consumers discover them, maintaining trust and preventing cascading failures.

The Online Observer still relies on a data observation job to generate all observation metrics. However, the difference between this pattern and the offline approach is the time at which it executes. The Online Observer's job is an intrinsic part of the data generation pipeline, and as a result, the produced insight is available just after data generation. That approach can help avoid many communication and technical issues with downstream consumers.

#### 📊 Implementation Approaches

**For Batch Pipelines:**

<DiagramContainer title="Online Observer in Batch Pipeline">
  <Column gap="lg">
    <Group title="Parallel Split Approach" color={colors.blue} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.purple} size="md">Transform</Box>
        <Arrow direction="down" />
      </Row>
      <Row gap="md" wrap={true}>
        <Box color={colors.blue} size="md">Observe</Box>
        <Box color={colors.green} size="md">Load</Box>
      </Row>
    </Group>
    <Group title="Local Sequencer Approach" color={colors.cyan} direction="column">
      <Row gap="md" wrap={true}>
        <Box color={colors.purple} size="md">Transform</Box>
        <Arrow direction="right" />
        <Box color={colors.green} size="md">Load</Box>
        <Arrow direction="right" />
        <Box color={colors.cyan} size="md">Observe</Box>
      </Row>
    </Group>
  </Column>
</DiagramContainer>

If we reason about our data generator in terms of ETL or ELT steps, the most popular place to put the observation job is after the Transform stage, where you can orchestrate it in the Parallel Split pattern or Local Sequencer pattern.

**For Streaming Pipelines:**

<DiagramContainer title="Online Observer in Streaming Pipeline">
  <Row gap="md" wrap={true}>
    <Box color={colors.blue} size="md">Read Stream</Box>
    <Arrow direction="right" />
    <Box color={colors.purple} size="md">Transform + Observe</Box>
    <Arrow direction="right" />
    <Box color={colors.green} size="md">Write Stream</Box>
  </Row>
</DiagramContainer>

When it comes to streaming pipelines, you need to integrate the observation logic into the data generation job. Even though this sounds like the batch implementation, there is a significant difference - you will not be able to run the observation step as a separate pipeline. Consequently, any issues with the data observability part (unexpected error or memory issues) may impact the whole job. You can try to mitigate this risk by sampling the dataset to perform data observation, accepting that you'll miss some insights during the process.

> **Insight**
>
> Even though this section discusses observability related to processed data, observability covers a wider scope. It also includes technical metadata, such as CPU, memory, or disk usage of your data engineering tools. Most of the time, they'll be near real-time measurements and therefore available in the Online Observer pattern.

#### ⚖️ Consequences

Even though the Online Observer pattern addresses the time accuracy issue of the Offline Observer, it has some gotchas.

**Extra Delays:**
If you use the Local Sequencer approach to integrate the data observation job, you'll add it as an extra step at the end of the pipeline. Naturally, this will delay the pipeline's completion. Adding this extra monitoring step to the main workflow doesn't come for free.

**Parallel Splits:**
The Parallel Split approach adds extra parallelism to the pipeline by running observation and data loading steps at the same time. However, it also brings danger of observing a partially valid dataset. For example, if the date time format is different from the one expected by the database, the database will be missing date time values. However, the data observation step, since it runs on the loaded dataset directly, will not see this issue.

> **Warning**
>
> To mitigate the parallel split problem, you should use the Local Sequencer approach that observes the dataset exposed to consumers. Eventually, you can decide to apply your data observation scope to the processed and not exposed dataset. In this logic, observation focuses on the transformation instead of the data loading task. However, this strategy may not be relevant throughout the whole lifespan of the pipeline.

#### 💻 Examples

**Batch Pipeline (Apache Airflow):**

The batch pipeline now integrates the data observation step into the data processing pipeline:

```python
wait_for_new_data = SqlSensor(...)
record_new_synchronization_state = PostgresOperator(...)
clean_previously_added_visits = PostgresOperator(...)
copy_new_visits = PostgresOperator(...)
record_new_observation_state = PostgresOperator(...)
insert_new_observations = PostgresOperator(...)

wait_for_new_data >> record_new_synchronization_state
  >> clean_previously_added_visits >> copy_new_visits
copy_new_visits >> record_new_observation_state >> insert_new_observations
```

As you'll notice, the observation pipeline is now part of the same data generation pipeline. This involves the potential risk of pipeline failure if there are issues at the data observation level. To overcome this risk, you add a final task that does nothing and that will be triggered independently on the observation job. Consequently, the execution of this task will mark the pipeline as successful even in cases of observation failure. In Apache Airflow, you can achieve this with a trigger rule set to `all_done`.

**Streaming Pipeline (Apache Spark):**

For streaming pipelines, the code is merged with two major changes: lag detection and accumulators. The data reader now includes two extra columns - partition number and offset position for each retrieved row. The lag detector code relies on them to get the most recently processed record in the microbatch:

```python
import dataclasses
from typing import List, Dict, Iterator
from pyspark import AccumulatorParam
from pyspark.sql import DataFrame, Row

@dataclasses.dataclass
class PartitionWithOffset:
    partition: int
    offset: int

class PartitionToMaxOffsetAccumulatorParam(AccumulatorParam):
    def zero(self, default_max: PartitionWithOffset):
        return []

    def addInPlace(self, partitions_with_offsets: List[PartitionWithOffset],
                    new_max_candidate: PartitionWithOffset):
        partitions_with_offsets.append(new_max_candidate)
        return partitions_with_offsets

def write_to_kafka_with_observer(visits: DataFrame, batch_number: int):
    ctx = visits_to_analyze.sparkSession.sparkContext
    max_offsets_tracker = ctx.accumulator([], PartitionToMaxOffsetAccumulatorParam())

    def analyze_generated_records(visits_iterator: Iterator[Row]):
        for visit_record in visits_iterator:
            # ...
            if visit_record.offset > max_local_offset:
                max_local_offset = visit_record.offset
            current_partition = visit_record.partition

            max_offsets_tracker.add(
                PartitionWithOffset(partition=current_partition, offset=max_local_offset)
            )

    visits_to_analyze.foreachPartition(analyze_generated_records)
```

Another modification is using accumulators to avoid complex SQL queries generating both numbers of invalid rows and max offsets per partition:

```python
accumulators = {
    'event_time': spark_context.accumulator(0),
    'user_id': spark_context.accumulator(0),
    'page': spark_context.accumulator(0)
}
all_events_accumulator = spark_context.accumulator(0)

def analyze_generated_records(visits_iterator: Iterator[Row]):
    for visit_record in visits_iterator:
        if not visit_record.event_time:
            accumulators['event_time'].add(1)
        if not visit_record.user_id:
            accumulators['user_id'].add(1)
        if not visit_record.page:
            accumulators['page'].add(1)
# ...

observation_dump = {
    '@timestamp': datetime.utcnow().isoformat(),
    'invalid_event_time': accumulators['event_time'].value,
    'invalid_user_id': accumulators['user_id'].value,
    'invalid_page': accumulators['page'].value,
    'all_events': all_events_accumulator.value,
    # ...
}
```

> **Insight**
>
> Accumulators are Apache Spark-specific components that run locally on each executor as long as you don't invoke the value method. When the value function is called, executors send their local accumulators to the main node of the cluster, which performs results aggregation. In our data observation example, using accumulators is a great way to avoid querying the input dataset twice (once for lag and once for invalid columns).

---

## 5. Summary

### Key Takeaways

In this chapter, you learned about three important components you can use to build trustworthy datasets:

**1. Quality Enforcement** — Design patterns that prevent poor-quality data from being exposed:
- **Audit-Write-Audit-Publish (AWAP)**: Adds validation controls before and after transformation to ensure input and output datasets meet requirements
- **Constraints Enforcer**: Delegates quality controls to the database or storage format using declarative constraint definitions
- **Schema Compatibility Enforcer**: Prevents breaking schema changes through external services, implicit validation, or event-driven mechanisms

**2. Schema Consistency** — Design patterns that handle schema evolution safely:
- **Schema Compatibility Enforcer**: Enforces compatibility rules (backward, forward, full) to prevent incompatible schema changes
- **Schema Migrator**: Enables breaking changes through grace periods where old and new schema versions coexist

**3. Quality Observation** — Design patterns that monitor datasets to detect evolving quality issues:
- **Offline Observer**: Separate observability job running independently from data generation pipeline
- **Online Observer**: Integrated observability as intrinsic part of data generation pipeline for near-real-time insights

<ComparisonTable
  beforeTitle="Enforcement Patterns"
  afterTitle="Observation Patterns"
  beforeColor={colors.blue}
  afterColor={colors.green}
  items={[
    {
      label: "Purpose",
      before: "Prevent bad data",
      after: "Detect evolving issues"
    },
    {
      label: "Timing",
      before: "Before data exposure",
      after: "During or after processing"
    },
    {
      label: "Pipeline Impact",
      before: "Can block pipeline",
      after: "Non-blocking monitoring"
    },
    {
      label: "Rules",
      before: "Static validation rules",
      after: "Adaptive trend detection"
    }
  ]}
/>

Although enforcing constraints and controls prevents publication of poor-quality datasets, it doesn't guarantee there will be no issues. In fact, it only guarantees there will be no issues with the rules you defined. Unfortunately, you may miss defining some rules or simply need to adapt them to the evolved dataset. To overcome the issue of staying up-to-date, you will rely on observation patterns that work on different levels.

> **Insight**
>
> The Offline Observer is a detached component that runs independently on the data generation pipeline, trading time for reduced impact on production resources. The Online Observer is the opposite - integrated into the pipeline for near-real-time accuracy at the cost of potential delays and resource usage. Which approach is right for you depends on your willingness to trade time for accuracy.

With that, we're coming slowly but surely to the end of our data engineering design patterns journey. However, there's one topic left to cover: data observability that will help you detect issues in your data processing jobs and datasets. That's what the next chapter is all about!

---

**Previous:** [Chapter 8: Data Storage Design Patterns](./chapter8) | **Next:** [Chapter 10: Data Observability Design Patterns](./chapter10)
