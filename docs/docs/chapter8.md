---
sidebar_position: 8
title: "Chapter 8: Data Storage Design Patterns"
description: "Optimize data storage with partitioning, bucketing, sorting, and materialization patterns. Learn horizontal and vertical partitioning, metadata enhancement, and data representation strategies for faster query execution."
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';

# Chapter 8: Data Storage Design Patterns

> **"The fastest query is the one that doesn't need to run."**
>
> — Data Engineering Wisdom

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Partitioning](#2-partitioning)
   - 2.1. [Pattern: Horizontal Partitioner](#21-pattern-horizontal-partitioner)
   - 2.2. [Pattern: Vertical Partitioner](#22-pattern-vertical-partitioner)
3. [Records Organization](#3-records-organization)
   - 3.1. [Pattern: Bucket](#31-pattern-bucket)
   - 3.2. [Pattern: Sorter](#32-pattern-sorter)
4. [Read Performance Optimization](#4-read-performance-optimization)
   - 4.1. [Pattern: Metadata Enhancer](#41-pattern-metadata-enhancer)
   - 4.2. [Pattern: Dataset Materializer](#42-pattern-dataset-materializer)
   - 4.3. [Pattern: Manifest](#43-pattern-manifest)
5. [Data Representation](#5-data-representation)
   - 5.1. [Pattern: Normalizer](#51-pattern-normalizer)
   - 5.2. [Pattern: Denormalizer](#52-pattern-denormalizer)
6. [Summary](#6-summary)

---

## 1. Introduction

Have you ever waited for a query or job results longer than two minutes while working in a big data environment? Many of you will probably answer yes, and some of you may have even waited more than 10 minutes. This time factor is an important aspect in our data engineering work. The faster a query or job runs, the earlier we'll get the response and hopefully, the cheaper it will cost to get it.

**In plain English:** Imagine you're looking for a specific book in a massive library. You could search through every single shelf, or you could use the library's organization system - sections, categories, and index cards - to go straight to what you need.

**In technical terms:** Data storage design patterns are systematic approaches to organizing, indexing, and structuring data to minimize query execution time, reduce compute costs, and enable efficient data access at scale.

**Why it matters:** Proper data organization can reduce query times from minutes to seconds, lower cloud costs significantly, and enable real-time analytics that would otherwise be impossible on large datasets.

You can optimize this time factor in two ways. First, you can add more compute resources, which is a relatively quick and easy method without any extra organizational steps. However, it's also a retroactive step that you might need to perform under pressure, for example, after users start to complain about reading latency.

The second way to optimize is by taking preemptive action that relies on a wise data organization with the data storage design patterns covered in this chapter. This well-thought-out organization should improve execution time and provide feedback earlier.

<DiagramContainer title="Data Storage Optimization Approaches">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.orange} variant="filled" size="lg" icon="⚡">
        Reactive Approach
      </Box>
      <Box color={colors.red} variant="outlined" size="md">
        Add More Compute
      </Box>
      <Box color={colors.red} variant="outlined" size="md">
        Higher Costs
      </Box>
      <Box color={colors.red} variant="outlined" size="md">
        Under Pressure
      </Box>
    </Column>

    <Column gap="md" align="center">
      <Box color={colors.green} variant="filled" size="lg" icon="🎯">
        Proactive Approach
      </Box>
      <Box color={colors.green} variant="outlined" size="md">
        Optimize Storage
      </Box>
      <Box color={colors.green} variant="outlined" size="md">
        Lower Costs
      </Box>
      <Box color={colors.green} variant="outlined" size="md">
        Better Performance
      </Box>
    </Column>
  </Row>
</DiagramContainer>

> **Insight**
>
> The patterns in this chapter work together synergistically. Partitioning reduces data volume, bucketing and sorting optimize local access, metadata enhancement skips irrelevant data, and materialization trades storage for speed. Understanding when to apply each pattern is key to building high-performance data systems.

In this chapter, you'll first discover two partitioning strategies that help reduce the volume of data to process and also enable the implementation of some of the idempotency design patterns presented in Chapter 4, such as the Fast Metadata Cleaner pattern. Unfortunately, partitioning only works well for low-cardinality values (when you don't have a lot of different occurrences for a given attribute). For high-cardinality values, you may need more local optimization strategies, such as bucketing and sorting, which are presented as the second family of data storage patterns.

Besides organizing the data, there are other approaches to improving the user experience that you will see next in this chapter. They include the following:

- Leveraging the metadata layer to avoid unnecessary data-related operations
- Running costly operations only once, hence materializing them for subsequent readers
- Simplifying the data preparation step by avoiding costly listing operations

Finally, you'll also see two data representation approaches. The Normalizer approach favors data consistency, and the Denormalizer approach trades consistency for better execution time.

---

## 2. Partitioning

When you define your storage layer's layout, the first question you'll need to answer is, what are the best ways to divide the dataset to make it easily accessible? The answer consists of two patterns that are responsible for horizontal and vertical organization.

### 2.1. Pattern: Horizontal Partitioner

Among these approaches to data organization, horizontal organization is probably the most commonly used due to the simplicity of its implementation and its long-term popularity since the early days of data engineering.

#### Quick Reference

| | |
|---|---|
| **What it is** | The data ingestion process or the data store uses a partitioning attribute to save the dataset to a physically isolated storage space for each partitioning value. |
| **When to use** | ✓ Incremental data processing that uses only a portion of the whole dataset ✓ Time-based or low-cardinality business keys ✓ Need to enable idempotent pipelines with Fast Metadata Cleaner |
| **Core problem** | Static character of partitions creates granularity/metadata overhead with high-cardinality attributes, potential data skew, and mutability challenges. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Time-based partitioning (event time) | Processing incremental batches by date/hour |
| Nested partitioning (time + business key) | Need multiple access patterns (e.g., date + country) |
| Declarative partitioning (CREATE TABLE) | Data producer shouldn't know partitioning logic |
| Dynamic partitioning (partitionBy) | Partition value needs complex computation |

> 📁 **Full code**: [chapter-08/01-partitioning](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/01-partitioning)

---

#### Problem

You created a batch job that computes rolling aggregates for the previous four days. It ran fine for a few months, but when more data began arriving in your storage layer, the job's performance declined. The biggest issue you spotted is increased execution time for the filtering operation to ignore records older than four days.

To mitigate the problem temporarily, you added more compute power to the job's cluster. However, that increased your costs. You have to find a better approach that will keep the cost as low as it was in the beginning and reduce the execution time despite new ingested data.

#### Solution

The rolling aggregation from the problem statement is an example of incremental data processing that uses only a portion of the whole dataset. It's a perfect condition in which to use the Horizontal Partitioner pattern and balance execution time with costs.

The solution requires identifying a partitioning attribute, which is also known as a distribution key. The data ingestion process or the data store will later use this attribute to save the dataset to a physically isolated storage space for each partitioning value.

<DiagramContainer title="Horizontal Partitioning by Event Time">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg" icon="📊">
      Full Dataset
    </Box>
    <Arrow direction="down" label="partition by date" />
    <Row gap="md">
      <Box color={colors.purple} variant="outlined" size="md">
        2024-05-01
      </Box>
      <Box color={colors.purple} variant="outlined" size="md">
        2024-05-02
      </Box>
      <Box color={colors.purple} variant="outlined" size="md">
        2024-05-03
      </Box>
      <Box color={colors.green} variant="filled" size="md">
        2024-05-04 ✓
      </Box>
      <Box color={colors.green} variant="filled" size="md">
        2024-05-05 ✓
      </Box>
    </Row>
    <Box color={colors.green} variant="subtle" size="md">
      Query only reads last 2 days
    </Box>
  </Column>
</DiagramContainer>

Time-based partitions are popular and illustrate the horizontal parameter. As in our problem statement, they define time boundaries for the data processing step, letting you query the relevant information in a fast and cheap manner. In that context, the time attribute can come from either of the following:

**The job execution context:** In this situation, the partitioning relies on the job's execution time, and the partition value will be the same for all records. For example, for a job executed on 2024-12-31, all records will land in the same partition corresponding to the run date.

**The dataset:** In this case, the partitioning logic reasons in terms of event time. Due to the late data phenomena described in Chapter 3, the partitioned dataset may contain values for different partitions.

Despite their popularity, time properties are not the only possibilities for partitioning keys. You can also use business keys, such as customer ID, partner ID, or the customer's geographical region. You can go even further and create nested partitioning schemas, for example, by combining time- and business-based attributes.

**Nested partitioning based on event time and country:**

```
visits/
└── 2024
    └── 05
        └── 05
            ├── france
            ├── india
            ├── poland
            └── usa
```

> **Insight**
>
> Horizontal partitioning is not just about performance - it's a foundational component of idempotency. When you can isolate data by time period, you can safely reprocess specific partitions without affecting others, enabling reliable data pipeline recovery and replay scenarios.

You can set partitions in a declarative way (while you create a table). That's the case with Databricks' or GCP BigQuery's `CREATE TABLE ... PARTITIONED BY` statement. In this approach, the data producer doesn't need to know anything about the underlying partitioning, and it could skip defining the partition value during the data ingestion. This flexibility doesn't exist in the opposite mode, where the partitioning logic comes from the data producer. An example here is Apache Spark with the `partitionBy` method, which creates partitions from an existing column that itself can be the result of a more or less complex computation. You can use the same dynamic logic in Apache Kafka, where you can customize the partitioning logic by creating your own partitioner class.

In addition to creating the partitions, some data stores also manage partition metadata, including the last update time, the number of rows, and even the creation time. This kind of information is available on GCP BigQuery from the `INFORMATION_SCHEMA.PARTITIONS` view, on Databricks as part of the output for the `DESCRIBE TABLE EXTENDED` command, and even on Apache Iceberg with the partitions view (`SELECT * FROM a_catalog.a_namespace.a_table.partitions`).

In addition to optimizing data retrieval, horizontal partitioning acts as an important component of idempotency. The Fast Metadata Cleaner pattern is one example of how to leverage partitioning to enable idempotent pipelines.

#### Consequences

Paradoxically, the biggest drawback of the Horizontal Partitioner is...horizontal partitions and, more specifically, their static character.

**Granularity and metadata overhead:**

A partition is a physical location storing similar entities sharing the same value for one attribute. Consequently, having too many partitions will have a negative impact on the database.

To help you understand this better, let's take a look at an example of a visits dataset from our case study. If our website is visited by one million unique users daily and we partition the dataset by username, the Horizontal Partitioner will create one million partitions. This will result in slow partitions listing operations and many small files to read (the small files problem described in the Compactor pattern).

For this reason, a good rule of thumb is to use low-cardinality attributes, which are attributes with few distinct values. Using the event time rounded to the nearest hour or day is a great example of this because typically, you get one day or one hour, and thus one partition, for a bunch of records. On the other hand, using the ID number for IoT devices will result in thousands of small partitions. For them, a better choice is to rely on the Bucket design pattern described later in this chapter.

> **Warning**
>
> Horizontal partitioning works best with low-cardinality attributes (date, region, category). Using high-cardinality attributes like user IDs or device IDs will create excessive partitions, leading to metadata overhead and the "small files problem" that degrades performance.

**Skew:**

You may be thinking that horizontal partitioning guarantees even data distribution, but that's not always true.

Skewed partitions can often be a source of latency issues. A good example here is the microbatch stream processing model, which incrementally processes small batches of records. It processes these small batches in a blocking manner (the next microbatch can't run as long as the previous batch isn't completed).

If one partition in the microbatch is unbalanced, the unbalanced partition will determine the duration of the microbatch. Put differently, it'll block shorter partitions from being processed early as they will have to wait for the unbalanced partition to complete before moving on. To mitigate this issue, you can apply a backpressure mechanism that will store all extraneous records from the skewed partition in a separate buffer and process them only in the next microbatch.

<DiagramContainer title="Data Skew Handling with Backpressure">
  <Column gap="md">
    <Row gap="md">
      <Box color={colors.green} variant="filled" size="md">
        Partition 1 (Small)
      </Box>
      <Box color={colors.green} variant="filled" size="md">
        Partition 2 (Small)
      </Box>
      <Box color={colors.red} variant="filled" size="lg">
        Partition 3 (Skewed)
      </Box>
    </Row>
    <Arrow direction="down" />
    <Row gap="md">
      <Column gap="sm" align="center">
        <Box color={colors.green} variant="outlined" size="sm">
          Process Fast
        </Box>
        <Box color={colors.green} variant="outlined" size="sm">
          Wait for P3
        </Box>
      </Column>
      <Column gap="sm" align="center">
        <Box color={colors.green} variant="outlined" size="sm">
          Process Fast
        </Box>
        <Box color={colors.green} variant="outlined" size="sm">
          Wait for P3
        </Box>
      </Column>
      <Column gap="sm" align="center">
        <Box color={colors.orange} variant="outlined" size="md">
          Processing...
        </Box>
        <Box color={colors.red} variant="outlined" size="sm">
          Excess to Buffer
        </Box>
      </Column>
    </Row>
  </Column>
</DiagramContainer>

The backpressure buffer will increase overall data delivery latency to the skewed partition as the task will deliver buffered input later. However, this approach guarantees the other tasks can run in close to real time.

**Mutability:**

Changing a partition key is difficult. It requires moving all already written data to a different location, which is costly and time-consuming.

Thankfully, some data stores may handle this mutability problem a bit better than others. For example, Apache Iceberg supports changing the partitioning schema at any moment. However, this operation works only at the metadata layer (it doesn't move the files to the new partition). Consequently, the partitioning storage remains unchanged for the old records, and the new organization applies only to the records created after the partition evolution.

> **Insight**
>
> Horizontal partitioning and sharding are related but distinct concepts. Sharding involves splitting a dataset across multiple physical machines, while horizontal partitioning divides data into multiple locations that may or may not be on different machines. Therefore, sharding is a special type of horizontal partitioning based on the physical (hardware) layer.

#### Examples

Let's first discover the Horizontal Partitioner pattern with Apache Spark. This data processing framework has a built-in method called `partitionBy` that natively splits the written dataset into partitions.

**Horizontal partitioning with Apache Spark creating granular partitioning columns:**

```python
partitioned_users = (input_users
 .withColumn('year', functions.year('change_date'))
 .withColumn('month', functions.month('change_date'))
 .withColumn('day', functions.day('change_date'))
 .withColumn('hour', functions.hour('change_date')))

(partitioned_users.write.mode('overwrite').format('delta')
 .partitionBy('year', 'month', 'day', 'hour').save(output_dir))
```

After executing this code, the job will create a dataset partitioned by year/month/day/hour, making possible many access patterns that combine the values present in the partitioning path.

The solution is slightly different for Apache Kafka, where you can implement a custom partitioning logic with a custom partitioner.

**Custom Apache Kafka partitioner:**

```java
public class RangePartitioner implements Partitioner {

  private static final int DEFAULT_PARTITION = 1;
  private final static Map<String, Integer> RANGES_PER_PARTITIONS = new HashMap<>();
  static {
   RANGES_PER_PARTITIONS.put("A", 0);
   RANGES_PER_PARTITIONS.put("B", 0);
  }

  @Override
  public int partition(String topic, Object key, byte[] keyBytes,
   Object value, byte[] valueBytes, Cluster cluster) {
    String keyAsString = key.toString();
    return RANGES_PER_PARTITIONS.getOrDefault(keyAsString, DEFAULT_PARTITION);
  }
// ...
```

To declare your custom partitioner, you need to reference the created class in the `partitioner.class` property:

```java
Properties props = new Properties();
// ...
props.put("partitioner.class", "com.waitingforcode.RangePartitioner");
```

> **Insight**
>
> Keep in mind that any code increases complexity. That's why it's always good to favor simplicity and add code (and thus complexity) only when necessary. As a result, most of the time, you will stick to the default partitioners in Apache Kafka.

In addition to Apache Spark and Apache Kafka, Horizontal Partitioner is present in relational databases.

**Range partitioning logic for date times in PostgreSQL:**

```sql
CREATE TABLE visits_all (
  visit_id CHAR(36) NOT NULL,
  event_time TIMESTAMP NOT NULL,
  user_id  TEXT NOT NULL,
  page VARCHAR(20) NULL,
  PRIMARY KEY(visit_id, event_time)
) PARTITION BY RANGE(event_time);

CREATE TABLE visits_all_20231124 PARTITION OF visits_all
FOR VALUES FROM('2023-11-24 00:00:00') TO ('2023-11-24 23:59:59')

CREATE TABLE visits_all_20231125 PARTITION OF visits_all
FOR VALUES FROM('2023-11-25 00:00:00') TO ('2023-11-25 23:59:59')
```

### 2.2. Pattern: Vertical Partitioner

As you've seen, the Horizontal Partitioner pattern processes whole rows each time. The next partitioning pattern is its alternative because it divides each row and writes the separate parts to different places, such as tables or files.

> **Note**
>
> The Vertical Partitioner pattern presented in Chapter 7 is a specialization of vertical partitioning applied to security. The Vertical Partitioner presented in this chapter is a specialization dedicated to data storage.

#### Quick Reference

| | |
|---|---|
| **What it is** | A data processing job writes grouped attributes for each row into dedicated locations after data classification identifies related attributes. |
| **When to use** | ✓ Attributes with different mutability (mutable vs. immutable) ✓ Need different data retention policies per attribute group ✓ Optimize storage costs by avoiding duplicate immutable data |
| **Core problem** | Domain split makes logically related attributes harder to find, querying requires joins, and data producers must implement row division logic. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Mutable/immutable split | Have frequently changing and stable attributes |
| Apache Spark (persist + drop/select) | Need to split row across multiple tables efficiently |
| SQL INSERT INTO...SELECT FROM | Inserting vertically partitioned data from source |
| CREATE TABLE AS SELECT (CTAS) | Creating new vertically partitioned table from query |

> 📁 **Full code**: [chapter-08/01-partitioning](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/01-partitioning)

---

#### Problem

In one of your pipelines, you track user visits to your website. The visits dataset has two categories of attributes: mutable ones that change at each visit (such as visit time or visited page) and immutable ones that remain the same throughout the visit (like IP address). You're looking for a way to avoid duplicating the immutable information and store it only once for each visit.

#### Solution

Having two types of attributes like in our problem statement is the perfect condition to use the Vertical Partitioner pattern.

The implementation begins with data classification, where you need to put related attributes together. For the announced problem statement, you would divide the attributes into the mutable and immutable groups. In addition to those groups, you need to identify an attribute that you're going to use to combine them if needed. In our example, it'll be the visit ID.

Once this specification step is completed, your data processing job will write the grouped attributes for each row into dedicated locations, such as tables in a data store or directories in a file system.

<DiagramContainer title="Horizontal vs Vertical Partitioning">
  <Column gap="lg">
    <Group title="Horizontal Partitioning" color={colors.blue}>
      <Column gap="sm">
        <Box color={colors.blue} variant="filled" size="md">
          Visit Row (All Columns) → Partition A
        </Box>
        <Box color={colors.blue} variant="filled" size="md">
          Visit Row (All Columns) → Partition B
        </Box>
      </Column>
    </Group>

    <Group title="Vertical Partitioning" color={colors.purple}>
      <Row gap="md">
        <Box color={colors.purple} variant="filled" size="md">
          Visit ID + Mutable → Table A
        </Box>
        <Box color={colors.green} variant="filled" size="md">
          Visit ID + Immutable → Table B
        </Box>
      </Row>
    </Group>
  </Column>
</DiagramContainer>

In addition to optimizing storage costs, the Vertical Partitioner pattern brings flexibility. Because a row is now divided, you can easily apply different data retention or data access policies to it. That would be more challenging to put in place if the row were kept undivided.

To sum up, the difference with the Horizontal Partitioner pattern comes from the partitioning heuristic. The horizontal approach applies the partitioning rule to a whole row by moving it fully to a different location. On the other hand, the vertical logic splits a row and writes it to different locations.

> **Insight**
>
> Vertical partitioning excels when you have attributes with different lifecycles or access patterns. For example, you might have frequently changing transactional data and rarely changing reference data in the same logical entity. By separating them, you can optimize storage, apply different retention policies, and reduce write amplification on stable attributes.

#### Consequences

However, the Vertical Partitioner pattern has some logical implications in the following areas.

**Domain split:**

Since each row is split apart, there may be logically related attributes that are stored in two separate places. It may not be easy to find them, and good documentation support for your end user will be key.

**Querying:**

This drawback results from the domain split. As each row is separated, it gets harder to get the full picture than in a horizontally partitioned dataset. To mitigate this issue, you can expose the data from a view combining all tables for the vertically partitioned entity (for example, with the Dataset Materializer pattern).

**Data producer:**

In addition to the consumers, the Vertical Partitioner impacts the producers, who from now on can't simply take a row and write it elsewhere. Instead, producers need to implement the row division logic and consequently perform multiple writes at a potentially higher network communication cost.

#### Examples

Let's begin this section with an Apache Spark example that extracts the user and technical visit context into two different tables. Although this task sounds easy, you must remember to call the `persist()` function so that the input dataset doesn't get read twice. Later, you need to build both tables by using `drop()` and `select()` functions to, respectively, remove and select columns.

**Vertical Partitioner in Apache Spark:**

```python
visits = spark_session.read.schema(visit_schema).json(input_location)
visits.persist()

visits_without_user_technical_context = (visits.drop('user_id')
 .withColumn('context', F.col('context').dropFields('user'))
 .withColumn('context', F.col('context').dropFields('technical')))
visits_without_user_technical_context.write.format('delta').save(output_dir)

(visits.selectExpr('visit_id', 'context.user.*', 'user_id').dropDuplicates()
.write.format('delta').save(get_delta_users_table_dir()))

(visits.selectExpr('visit_id', 'context.technical.*').dropDuplicates()
.write.format('delta').save(get_delta_technical_table_dir()))

visits.unpersist()
```

When it comes to a SQL-based implementation, let's see what commands can help you implement the pattern in PostgreSQL. The first command uses the `INSERT INTO...SELECT FROM` operation. Here, instead of declaring each row to insert explicitly, you delegate this declaration task to the dynamic SELECT query.

**Inserting technical visit context with INSERT INTO...SELECT FROM:**

```sql
INSERT INTO dedp.technical (visit_id, browser, browser_version, ...)
 (SELECT DISTINCT visit_id, context->'technical'->>'browser',
    context->'technical'->>'browser_version', ...
  FROM dedp.visits_all);
```

Also, you can use a different approach that creates the vertically partitioned table from a SELECT statement. This is commonly known as a CREATE TABLE AS SELECT (CTAS) construction.

**CTAS construction for the technical context of a vertically partitioned visit:**

```sql
CREATE TABLE dedp.technical_select AS (SELECT DISTINCT
  visit_id, context->'technical'->>'browser' AS browser,
  context->'technical'->>'browser_version' AS browser_version, ...
  FROM dedp.visits_all;
```

---

## 3. Records Organization

Partitioning is often the first step in organizing data. But as you've seen, it's rather rudimentary as it moves either full or partial records to different locations. Moreover, you can't use it on all attributes. For example, you've seen that high-cardinality values are not well suited to horizontal partitioning. The next category of patterns goes one step further because it applies some smart optimizations for records colocation, addressing, among other things, the cardinality issues of the Horizontal Partitioner pattern.

### 3.1. Pattern: Bucket

If, for whatever reason, you need to improve access to a column with high cardinality, such as a unique user ID, there is hope. Instead of colocating rows in the same storage space with partitioning, you can colocate groups of rows. That's an oversimplified definition of what the next pattern does.

#### Quick Reference

| | |
|---|---|
| **What it is** | Colocates different high-cardinality values in the same storage area using a modular hashing algorithm (hash(key) % buckets number) to group records. |
| **When to use** | ✓ High-cardinality column frequently used in queries ✓ Need to optimize JOIN operations with identical bucketing on both sides ✓ Partitioning would create too many partitions |
| **Core problem** | Bucketing schema is immutable; changing column or bucket size requires costly backfilling, and finding the right bucket size is challenging for future growth. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Bucket pruning | Using bucket column as predicate in queries |
| Shuffle elimination for JOINs | Both tables bucketed identically on join key |
| Apache Spark bucketBy | Need dynamic bucketing in data processing |
| AWS Athena CLUSTERED BY | Working with existing bucketed data on S3 |

> 📁 **Full code**: [chapter-08/02-records-organization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/02-records-organization)

---

#### Problem

The dataset you're modeling has a business attribute that is frequently used in queries as part of the predicate. Initially, you wanted to use this attribute as a partitioning column, but its cardinality is too high. It would result in too many partitions that at some point could reach your data store metadata limits. As 80% of operations rely on this high-cardinality attribute, you still want to optimize storage, but at the moment, you don't know how.

#### Solution

The fact that you've got a high-cardinality column that is often involved in queries is a good reason to use the Bucket pattern. Although on the surface it also stores records in a dedicated location, unlike Horizontal Partitioner, it colocates different values in the same storage area.

<DiagramContainer title="Bucketing for High-Cardinality Attributes">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg" icon="👥">
      High-Cardinality Column (user_id)
    </Box>
    <Arrow direction="down" label="hash(user_id) % 50 buckets" />
    <Row gap="sm" wrap={true}>
      <Box color={colors.purple} variant="outlined" size="sm">Bucket 0</Box>
      <Box color={colors.purple} variant="outlined" size="sm">Bucket 1</Box>
      <Box color={colors.purple} variant="outlined" size="sm">Bucket 2</Box>
      <Box color={colors.purple} variant="outlined" size="sm">...</Box>
      <Box color={colors.purple} variant="outlined" size="sm">Bucket 49</Box>
    </Row>
    <Box color={colors.green} variant="subtle" size="md">
      Multiple user_ids per bucket
    </Box>
  </Column>
</DiagramContainer>

As for the two partitioning patterns, the Bucket pattern's implementation starts with the data analysis step that defines the column(s) to use for bucketing. If a dataset is already partitioned with the horizontal or vertical approach, you can consider these attributes as a kind of secondary set of grouping keys (the partition key being the primary key), which are more commonly known as bucket columns.

Next, you might also need to set the number of buckets you want to create. The number depends on your bucket key's cardinality. If the cardinality is really high, it means you have a lot of unique values. A higher number would mean more smaller buckets, while a lower number would create fewer bigger buckets. This dependency comes from the grouping formula that applies a modular hashing so that the bucket number for each key is computed as `hash(key) % buckets number`.

Grouping records enables two optimization techniques for consumers:

**Bucket pruning:** Whenever a bucket column is used as a predicate in the query, the query execution engine can directly use the bucketing algorithm and eliminate all buckets without the required keys. This may cause a significant performance boost for all filtering operations.

**Network exchange (shuffle) elimination:** This applies to JOIN operations using the identical bucketing configuration on both sides of the join. That way, the query runner can leverage the buckets to directly load correlated records from each dataset to the same join process, thus combining them without the network exchange you discovered while reading about the Distributed Aggregator pattern.

<DiagramContainer title="Shuffle-Free Join with Bucketed Tables">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.blue} variant="filled" size="md">Table A (Bucketed by user_id)</Box>
      <Column gap="sm">
        <Box color={colors.blue} variant="outlined" size="sm">Bucket 0</Box>
        <Box color={colors.blue} variant="outlined" size="sm">Bucket 1</Box>
        <Box color={colors.blue} variant="outlined" size="sm">Bucket 2</Box>
      </Column>
    </Column>

    <Column gap="md" align="center">
      <Arrow direction="right" label="local join" />
      <Box color={colors.green} variant="filled" size="md" icon="✓">No Shuffle!</Box>
    </Column>

    <Column gap="md" align="center">
      <Box color={colors.purple} variant="filled" size="md">Table B (Bucketed by user_id)</Box>
      <Column gap="sm">
        <Box color={colors.purple} variant="outlined" size="sm">Bucket 0</Box>
        <Box color={colors.purple} variant="outlined" size="sm">Bucket 1</Box>
        <Box color={colors.purple} variant="outlined" size="sm">Bucket 2</Box>
      </Column>
    </Column>
  </Row>
</DiagramContainer>

Historically, the bucketing feature was made popular by Apache Hive, but since then, it has been integrated into modern data solutions, including Apache Spark and AWS Athena.

> **Insight**
>
> Bucketing is the bridge between partitioning and sorting. It provides the benefits of data locality for high-cardinality columns without the metadata overhead of creating millions of partitions. When combined with partitioning, you get a two-tier organization strategy that scales effectively.

#### Consequences

Yet again, the data is static, and that's one of the biggest issues with the Bucket pattern.

**Mutability:**

The bucketing schema is immutable. Technically, it's possible to modify it by either changing the column or bucket size, but that's a costly operation requiring backfilling the dataset.

**Bucket size:**

The Bucket pattern requires setting the bucket size. Unfortunately, finding the right size is challenging if you expect to get more data in the future. If you rely on the current data volume, in the future, you'll create big buckets. On the other hand, if you try to predict the number, there's no guarantee that your prediction will be accurate, and in the meantime, the writers may create more buckets than necessary. Both techniques are acceptable ways to mitigate the problem, but as you can see, they both have some gotchas.

> **Warning**
>
> Choosing the right bucket size is critical. Too few buckets create large, inefficient buckets; too many buckets negate the benefits. Start with a conservative estimate based on your current data volume, then multiply by expected growth over the next 2-3 years. Common choices are powers of 2 or multiples of 10 (e.g., 50, 100, 200).

#### Examples

Amazon Athena is a serverless query service implementing the Bucket pattern at the logical level. Put differently, it doesn't write any data. Instead, it only applies the existing bucketing logic to the tables already stored on S3. For that reason, if you issue an INSERT INTO query into a bucketed table, you will get an error.

To configure a table as a bucketed table, you have to define the bucket columns in the `CLUSTERED BY` statement, plus set the bucketing format.

**Bucketing configuration in AWS Athena:**

```sql
CREATE EXTERNAL TABLE visits (...) ...
CLUSTERED BY (`user_id`) INTO 50 BUCKETS
TBLPROPERTIES ('bucketing_format' = 'spark')
```

Apache Spark creates a bucketed table by calling the `bucketBy` function, which applies the modulo-based algorithm mentioned in the implementation section to the bucket columns.

**Bucketing in Apache Spark:**

```python
input_dataset.write.bucketBy(50, 'user_id').saveAsTable(table_name)
```

### 3.2. Pattern: Sorter

Colocating groups of records in buckets is not the only storage optimization technique. Another technique that helps eliminate data blocks that are irrelevant to queries relies on data storage order.

#### Quick Reference

| | |
|---|---|
| **What it is** | The database organizes written rows according to declared sorting columns, enabling queries to skip irrelevant data blocks using metadata information. |
| **When to use** | ✓ Columns commonly used in sorting or filtering ✓ Need to skip irrelevant data blocks before loading ✓ Multi-column filtering with Z-order for curved sorts |
| **Core problem** | Unsorted segments appear when writing new records, composite sort keys only work efficiently when queries reference leftmost columns, and changing sorting keys requires costly table re-sorting. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Lexicographical sort (single column) | Queries consistently filter on one column |
| Lexicographical sort (composite) | Queries follow left-to-right column pattern |
| Z-order sort | Need efficient multi-column filtering without order |
| GCP BigQuery CLUSTER BY | Using cloud warehouse with automatic clustering |

> 📁 **Full code**: [chapter-08/02-records-organization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/02-records-organization)

---

#### Problem

You decided to store data in weekly tables to leverage the Fast Metadata Cleaner pattern. Although it made your daily maintenance task less painful, it didn't improve the query execution time. You don't want to change this idempotency strategy, but at the same time, you would like to reduce data access latency. For that reason, you're looking for a solution that could speed up query execution. The good news is that you know the types of users' queries. Most of them will filter or sort by the event time column.

#### Solution

Knowing which column or columns are commonly used in sorting or filtering is a good way to implement the Sorter pattern to optimize data access.

You start the implementation by identifying the sorting column or columns. Next, you have to declare the sorting column(s) in the table's creation query. Thereafter, the database will take care of organizing the written rows according to the defined order.

Thanks to the sorted storage, any query targeting the sorting column(s) will be able to skip irrelevant data blocks, very often thanks to the metadata information associated with each of them.

<DiagramContainer title="Data Skipping with Sorted Storage">
  <Column gap="md">
    <Row gap="md">
      <Column gap="sm" align="center">
        <Box color={colors.slate} variant="outlined" size="sm">File 1</Box>
        <Box color={colors.slate} variant="subtle" size="sm">visit_time: 09:00-12:00</Box>
        <Box color={colors.red} variant="subtle" size="sm">Skip ✗</Box>
      </Column>
      <Column gap="sm" align="center">
        <Box color={colors.green} variant="filled" size="sm">File 2</Box>
        <Box color={colors.green} variant="subtle" size="sm">visit_time: 12:00-15:00</Box>
        <Box color={colors.green} variant="subtle" size="sm">Read ✓</Box>
      </Column>
      <Column gap="sm" align="center">
        <Box color={colors.slate} variant="outlined" size="sm">File 3</Box>
        <Box color={colors.slate} variant="subtle" size="sm">visit_time: 15:00-18:00</Box>
        <Box color={colors.red} variant="subtle" size="sm">Skip ✗</Box>
      </Column>
    </Row>
    <Box color={colors.green} variant="subtle" size="md">
      Query: WHERE visit_time BETWEEN 12:30 AND 14:30
    </Box>
  </Column>
</DiagramContainer>

Curved sorts is a variant of the classical top-to-bottom sorting algorithm, where the results are sorted vertically. A popular example of this, especially thanks to recent advances in the table file formats space, is Z-order. Instead of lexicographical order, this method colocates rows from x-dimensional space.

Explaining the Z-order algorithm in detail is out of scope of this book, but fortunately for you, table file formats like Apache Iceberg and Delta Lake implement it natively. However, it's important to understand why Z-order works better than lexicographical order for multiple columns.

<DiagramContainer title="Lexicographical Sort vs Z-Order Sort">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.orange} variant="filled" size="md">Lexicographical Sort</Box>
      <Box color={colors.orange} variant="outlined" size="md">Sort by X, then Y</Box>
      <Box color={colors.red} variant="subtle" size="sm">9 blocks read</Box>
    </Column>

    <Column gap="md" align="center">
      <Box color={colors.green} variant="filled" size="md">Z-Order Sort</Box>
      <Box color={colors.green} variant="outlined" size="md">Curved spatial organization</Box>
      <Box color={colors.green} variant="subtle" size="sm">7 blocks read ✓</Box>
    </Column>
  </Row>
</DiagramContainer>

Z-order became famous with Delta Lake and Apache Iceberg, but it has been around for longer. Among other data stores, Amazon Redshift provides a Z-order-like sort implementation based on Z-curves with the interleaved sort keys feature. Classical sorting is present in data warehouses such as GCP BigQuery and Snowflake via clustered tables.

> **Insight**
>
> Z-order is also referenced in the context of clustering due to colocating related records in the same files. However, it does this by effectively sorting data on disk, like a lexicographical sort would do. For that reason, Z-order is classified here as an example of the Sorter pattern.

#### Consequences

A presorted dataset has a positive impact on the reader's performance. However, it negatively impacts the writer.

**Unsorted segments:**

Sorting may not always be an instantaneous activity. This means that whenever you write new records, there will be some unsorted blocks that will not benefit from the Sorter pattern's optimizations. To mitigate the issue, you may need to schedule the sorting actions in the data writing job or outside of it. Keep in mind that integrating the sorting action with the data writing process will impact the execution time.

**Composite sort keys:**

When you use composite sort keys in the lexicographical order method, keep in mind that the queries should always reference the sorting columns preceding the one(s) you're targeting. Otherwise, despite sort declaration, the query engine will still need to iterate over most of the data blocks.

<DiagramContainer title="Composite Sort Key Query Impact">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.green} variant="filled" size="md" icon="✓">
        Efficient Query
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        WHERE visit_time = X AND page = Y
      </Box>
      <Box color={colors.green} variant="subtle" size="sm">
        Uses both sort keys
      </Box>
    </Column>

    <Column gap="md" align="center">
      <Box color={colors.red} variant="filled" size="md" icon="✗">
        Inefficient Query
      </Box>
      <Box color={colors.red} variant="outlined" size="sm">
        WHERE page = Y
      </Box>
      <Box color={colors.red} variant="subtle" size="sm">
        Skips first sort key
      </Box>
    </Column>
  </Row>
</DiagramContainer>

**Mutability:**

Although it's often possible to change the sorting keys after creating them, you must be aware that the operation may need to sort the entire table. Depending on the table's size, this can be costly.

> **Warning**
>
> For composite sort keys in lexicographical order, queries must include the leftmost sort column(s) to benefit from data skipping. A table sorted by (visit_time, page) will not efficiently serve queries that only filter on page. Consider Z-order for multi-column filtering scenarios.

#### Examples

Let's start this section with a cloud example. GCP BigQuery implements the Sorter pattern via clustered tables. A clustered table requires the declaration of the sorting columns as part of the `CLUSTER BY` statement.

**Clustered table for visit_id and page columns in BigQuery:**

```sql
CREATE TABLE `dedp.visits.raw_visits`
PARTITION BY DATE(event_time)
CLUSTER BY visit_id, page
```

Although the clustered table will improve performance when it comes to targeting the `visit_id` and `page` columns, it will not help that much if you only need to filter on the `page` column. Curved sorts solve this issue. Let's see how by using a Delta Lake Z-order compaction. Creating a Z-order-compacted table requires calling the optimized API with the columns that should be used to create this curved distribution.

**Z-order compaction with Delta Lake for the visit_id and page columns:**

```python
DeltaTable.forPath(spark, output_dir)
  .optimize().executeZOrderBy(['visit_id', 'page'])
```

As a result, Delta Lake will compact data files to better organize the records inside the rewritten files.

---

## 4. Read Performance Optimization

The patterns from this section extend the data organization techniques presented so far to optimize data access.

### 4.1. Pattern: Metadata Enhancer

The first technique you can leverage to optimize reading performance uses metadata. This is one of the reasons why columnar file formats such as Apache Parquet have been viewed as disruptive changes in the data engineering field for many years.

#### Quick Reference

| | |
|---|---|
| **What it is** | Collecting and persisting statistics about stored records in a file footer or database table, enabling query engines to skip irrelevant data files before loading them. |
| **When to use** | ✓ Queries load full dataset then filter (want to reverse order) ✓ Using columnar formats like Apache Parquet ✓ Need to reduce query execution time and cost |
| **Core problem** | Building statistics adds overhead to writing time, and out-of-date statistics in databases may require manual refresh with ANALYZE TABLE commands. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Apache Parquet footer statistics | Using file-based storage with columnar format |
| Table file formats (Delta/Iceberg/Hudi) | Need transaction log metadata on top of Parquet |
| Database table statistics | Working with relational databases or warehouses |
| Manual ANALYZE TABLE refresh | Statistics become out-of-date due to small changes |

> 📁 **Full code**: [chapter-08/03-read-performance-optimization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/03-read-performance-optimization)

---

#### Problem

You partitioned your JSON dataset horizontally by event time, hoping to reduce the execution time of batch jobs. And it worked! However, your company then hired new data analysts who are also working on the same partitioned dataset but are targeting only a small subset of rows from one partition.

Since the partitions are big, data analysts complain about the query execution latency and increased cloud bills as they're relying on a pay-as-you-go querying service. After the first analysis, you find out that the data analysts' queries always load the full dataset and only later apply the filtering logic. You would like to reverse these two operations and apply the filtering logic before loading the dataset into the query engine.

#### Solution

An easy way to optimize the query execution time and cost is to skip all irrelevant data files before loading them for processing. That's where the Metadata Enhancer pattern comes into play.

The implementation consists of collecting and persisting statistics about the stored records in a file or database. Since we mentioned the files in the problem statement, let's discover this integration first.

<DiagramContainer title="Metadata Enhancer - Apache Parquet Footer">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg" icon="📄">
      Apache Parquet File
    </Box>
    <Arrow direction="down" />
    <Group title="Metadata Footer" color={colors.green}>
      <Column gap="sm">
        <Row gap="md">
          <Box color={colors.green} variant="outlined" size="sm">Min Value: 18</Box>
          <Box color={colors.green} variant="outlined" size="sm">Max Value: 65</Box>
        </Row>
        <Row gap="md">
          <Box color={colors.green} variant="outlined" size="sm">Row Count: 10,000</Box>
          <Box color={colors.green} variant="outlined" size="sm">Null Count: 0</Box>
        </Row>
      </Column>
    </Group>
    <Box color={colors.purple} variant="subtle" size="md">
      Query: WHERE age > 50 → Skip or Read?
    </Box>
  </Column>
</DiagramContainer>

The Metadata Enhancer implementation for files applies to columnar file formats such as Apache Parquet, in which each data file contains a footer with additional metadata. As per its name, the columnar file format stores a column in each file. The statistics are local to the file (they describe only the values from the file).

As you've likely noticed, the footer includes a range of possible values that are automatically computed while a file is created by the data producer. Now, when a user queries the age column as part of the predicate (for example, `SELECT ... FROM table WHERE age > 50`), the query execution engine can simply verify in the metadata footer whether the requested age is included in the file. Since the footer is smaller than the data block, the filtering operation relies on a reduced dataset and consequently is much faster than opening a larger portion of the data to analyze each entry separately. That said, there is still the overhead of reading all the footers to know where the relevant records are, but the overhead is incomparably smaller than for reading all the data files.

Since Apache Parquet is the storage format used by table file formats, the pattern is automatically available on Delta Lake, Apache Iceberg, and Apache Hudi. But in addition to the Apache Parquet statistics, these formats store additional metadata in the commit log that can optimize readers. Some of this metadata consists of numbers, such as the number of rows created in the commit, the minimum and maximum values per column, and even the number of NULLs in a given column. That way, users can pretty quickly perform queries counting the number of elements or filtering on nonexistent values.

But files are not the only place where the Metadata Enhancer applies. You can find the same kind of statistics for tables in relational databases and data warehouses. The statistics in that context will often be located in a separate table that the query planner will leverage to create the most efficient execution plans.

> **Insight**
>
> Metadata Enhancement is often invisible to users but provides dramatic performance improvements. By reading a few kilobytes of metadata instead of gigabytes of data, query engines can skip 90% or more of irrelevant data blocks. This is why columnar formats like Parquet have become the standard in modern data lakes.

#### Consequences

Although it's hard to find drawbacks for the Metadata Enhancer, there is a little one related to the cost of this additional layer.

**Overhead:**

When it comes to columnar file formats, building statistics at writing time is an extra operation the writing job must perform. It can slightly impact the processing time because for each processed column, the job must keep the configured stats.

Additionally, for relational databases and data warehouses, the data store must keep the statistics up-to-date. Otherwise, the execution plan might be far from the most optimal one. To address this issue when statistics are out of date, you can run a command that's responsible for refreshing them.

**Out-of-date statistics:**

Even though statistics are updated automatically for relational databases and data warehouses, the update process may not be immediate. Often, its execution is controlled by certain thresholds, such as the number of rows that have been modified since the last update. Consequently, if your table undergoes small changes from time to time that don't reach the thresholds, the statistics can become out of date over time.

To mitigate this issue, you can refresh the statistics manually with commands like `ANALYZE TABLE`. But keep in mind that this might add temporary read overhead on the database to process the table and generate updated statistics.

#### Examples

To start this section, let's look at the most basic example with Apache Parquet. The writing step in Apache Spark requires using an appropriate data writer.

**Writing an Apache Parquet file:**

```python
input_dataset.write.mode('overwrite').parquet(path=get_parquet_dir())
```

Statistics are created for you under the hood. You can see their content by running a Docker command like the one below:

```bash
docker run --rm -v "./output-parquet:/tmp/parquet"
  hangxie/parquet-tools:v1.20.7  meta
  /tmp/parquet/part-00001-3c52ae6f-aeea-4364-aac3-7fc69d63e898-c000.snappy.parquet
```

The output should print statistics for each column. Here's an example for the ID column:

```json
"NumRowGroups": 1, {"PathInSchema": ["Id"], "Type": "BYTE_ARRAY",
 "Encodings": ["PLAIN", "RLE", "BIT_PACKED"],"CompressedSize": 180463,
 "UncompressedSize": 200035,"NumValues": 5000,
 "NullCount": 0, "MaxValue": "fffbe4f8-8d88-43d2-a9a5-54bf536de75b",
 "MinValue": "0018e1dc-1b80-4410-92f6-5261d2dadf35",
 "CompressionCodec": "SNAPPY"}
```

Delta Lake adds an extra layer on top of the Apache Parquet metadata. This layer is present in the commit logs and also contains metadata to accelerate data processing operations. As for Parquet, you don't need to generate those values explicitly. That's done by the data processing framework under the hood.

**Statistics in the Delta Lake commit log:**

```json
{"commitInfo":{"timestamp":1716954694590,"operation":"WRITE",
"operationMetrics":{"numFiles":"1",
"numOutputRows":"6100",
"numOutputBytes":"50437"}," ...}
{"add":{"path":"part-...-c000.snappy.parquet, "size":50437,
"stats":"{
 \"numRecords\":6100,
 \"minValues\":
   {\"type\":\"galaxy\",\"full_name\":\"APPLE iPhone 11 (White, 64 GB)\",
    \"version\":\"Android 10\"},
 \"maxValues\":
   {\"type\":\"mac\",\"full_name\":\"Yoga 7i (14\\\" Intel) 2 in 1 Lapto�\",
    \"version\":\"v17169535721658688\"},
 \"nullCount\":{\"type\":0,\"full_name\":0,\"version\":0}}"}}
```

### 4.2. Pattern: Dataset Materializer

Costly operations pose another challenge to improving data access. If you need to write a query that involves some shuffle and CPU-intensive transformations, and if you need to run the same query over and over again, performance may suffer. Surprisingly, you could benefit from data duplication to improve data reading performance.

#### Quick Reference

| | |
|---|---|
| **What it is** | Materializing datasets by querying data with SELECT statements and combining with UNION or JOIN, then storing as a materialized view or table. |
| **When to use** | ✓ Slow computation of results run repeatedly ✓ Need single point of access to multiple partitioned tables ✓ Complex queries with shuffle and CPU-intensive operations |
| **Core problem** | Refresh cost impacts database resources, data access management across combined tables is challenging, and materialization trades query optimization for storage overhead. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Materialized view (auto-refresh) | Want automated refreshes (less predictable timing) |
| Materialized view (manual refresh) | Need control over refresh timing and workload |
| Table materialization | Need partitions/buckets/sorting optimization |
| Incremental refresh | Insert-only workloads where historical data doesn't change |

> 📁 **Full code**: [chapter-08/03-read-performance-optimization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/03-read-performance-optimization)

---

#### Problem

You wanted to simplify the process of querying multiple partitioned tables of the same dataset to get the past three weeks of data. You created a view, but consumers weren't fully satisfied. They complained about latency, and because the view runs the underlying query each time, you can see their point. However, you want to solve this issue and provide them with a better-performing single point of data access.

#### Solution

When the computation of results is slow, the simplest solution is to avoid the problem by materializing the data. That's what the Dataset Materializer pattern does.

<DiagramContainer title="View vs Materialized View">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.orange} variant="filled" size="md" icon="🔄">
        Regular View
      </Box>
      <Box color={colors.orange} variant="outlined" size="sm">
        Recompute every query
      </Box>
      <Box color={colors.red} variant="subtle" size="sm">
        Slow + Expensive
      </Box>
    </Column>

    <Column gap="md" align="center">
      <Box color={colors.green} variant="filled" size="md" icon="💾">
        Materialized View
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        Compute once, read many
      </Box>
      <Box color={colors.green} variant="subtle" size="sm">
        Fast + Cheap reads
      </Box>
    </Column>
  </Row>
</DiagramContainer>

The implementation starts by identifying the datasets that should be materialized. After the identification step, you need to implement the materialization. Typically, this will involve querying the data with the appropriate SELECT statements and maybe combining multiple datasets with a UNION or JOIN operation. Then, the created query is later used to materialize the dataset as a materialized view or a table in your database.

Which of the materialized view and table techniques should you chose? The biggest difference between them is related to refreshes. Manual refreshes of materialized views are possible, but modern data warehousing solutions support automatic refreshes under some criteria as well. For example, Amazon Redshift supports this feature via an `AUTO REFRESH YES` option defined in the `CREATE MATERIALIZED VIEW` statement. However, the refresh isn't meant to be run immediately after you change the underlying tables. Its execution depends on the current workload on the database or the size of the data to refresh. Therefore, the logic, albeit automated, is less predictable. Besides Redshift, materialized views are available in other data warehousing solutions, including GCP BigQuery, Databricks, and Snowflake.

On the other hand, when you use a table as the storage for the materialized dataset, you'll be responsible for refreshes, without the possibility of leveraging any automatic refresh feature. In exchange for this extra work, you get extra flexibility as the table may benefit from other storage optimization techniques—including partitions, buckets, and sorting—which may not be available for a materialized view. All this gives you more work to do but also provides more operational flexibility and optimization techniques.

> **Insight**
>
> Dataset Materializer represents a classic space-time tradeoff. You're trading storage (space) for query performance (time). The key is identifying which queries are run frequently enough to justify the storage overhead and refresh complexity. Start by materializing your top 10 most-run queries.

#### Consequences

While you may be thinking that refreshing is not an issue, I have bad news. It may be.

**Refresh cost:**

As you can imagine, whenever you need to refresh the view, you need to rerun the creation query. If this setup query is costly, perhaps because of the data volume or the type of operations, it'll impact the resources of your database, including the ones available for regular users interacting with other tables.

To overcome this issue, you can use an incremental refresh (integrate only the most recent changes into the view). This fits perfectly into insert-only workloads where historical data doesn't change and the refresh only appends the new records.

Modern data warehousing solutions support incremental refreshes out of the box. That's the case with Databricks and GCP BigQuery. However, their incremental refreshes don't support all SQL operations, and sometimes, they will still refresh the whole dataset.

**Data access:**

Because the materialized dataset combines multiple tables, it may be challenging to apply consistent data management, including retention or access configuration. Typically, if a user doesn't have access to one of the building tables, you should continue to deny access to the view, or you should implement one of the options in the Fine-Grained Accessor pattern, if possible.

**Data storage overhead:**

Materialization does indeed optimize access, but it trades optimization for storage. If storage is a concern for you, you may opt for a mixed implementation of the Dataset Materializer pattern, in which only some of the view's datasets get materialized and the others live as regular, recomputable parts.

#### Examples

GCP BigQuery is a cloud-managed data warehouse that not only supports materialized views but also let you configure an automatic refresh of them.

**Query creating an automatically refreshed materialized view in BigQuery:**

```sql
CREATE MATERIALIZED VIEW dedp.visits.visits_enriched
OPTIONS (enable_refresh = true, refresh_interval_minutes = 15)
AS SELECT...
```

There's one thing to notice, though: automatic refreshes are rarely guaranteed to run just after you modify the base table. This is also true for BigQuery, which should run the refresh within five minutes of the change. But if there is not enough capacity, the refresh will be delayed.

That's why as an alternative, you can use a manually refreshed materialized view. PostgreSQL provides a `REFRESH MATERIALIZED VIEW` command that integrates new data into the view:

```sql
REFRESH MATERIALIZED VIEW dedp.windowed_visits WITH DATA;
```

As for the incremental version of the Dataset Materializer pattern, let's analyze how to integrate new visit counts. First, the input table has an `insertion_time` column that corresponds to the writing time of each row. The idea is to use this column to query only the rows added after the previous execution and combine the result with the existing dataset. As you can see already, the solution combines the Incremental Loader pattern with the Merger pattern.

**Incremental version of the Dataset Materializer pattern:**

```sql
MERGE INTO dedp.visits_counter AS target
USING (
 -- 2024-11-09T03:27:32 is the time after the previous insertion_time
 SELECT user_id, COUNT(*) AS visits FROM dedp.visits
 WHERE insertion_time > '2024-11-09T03:27:32' GROUP BY user_id
) AS input
ON target.user_id = input.user_id
WHEN MATCHED THEN UPDATE SET count = count + input.visits
WHEN NOT MATCHED THEN INSERT (user_id, count) VALUES (input.user_id, input.visits)
```

### 4.3. Pattern: Manifest

The last read access performance challenge concerns data listing, which can be slow, especially for object stores with many files because this will result in many API calls. Even though you can try to mitigate this issue by parallelizing the listing operation, there is a better way.

#### Quick Reference

| | |
|---|---|
| **What it is** | Writing the list of files created within a transaction to a commit log or manifest file, allowing readers to access data files without performing listing operations. |
| **When to use** | ✓ Repeated listing operations on object stores are slow ✓ Many different readers operate on same dataset ✓ Need idempotent data loading (e.g., Redshift COPY) |
| **Core problem** | Adding manifest creation adds execution flow complexity, and manifests can grow really big with many small files or continuous streaming jobs. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Table file formats (auto-managed) | Using Delta Lake/Iceberg/Hudi with automatic manifests |
| Manual manifest creation | Many readers need same file list (Fan-Out patterns) |
| Amazon Redshift COPY manifest | Loading data idempotently into warehouse |
| GCP Storage Transfer Service manifest | Copying files from other cloud stores to GCS |

> 📁 **Full code**: [chapter-08/03-read-performance-optimization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/03-read-performance-optimization)

---

#### Problem

You have created an Apache Parquet dataset in your object store. Your batch jobs are now performing very well, and their decreased execution time has also reduced your cloud bill. As a result, your company has asked you to create a data warehouse layer. One of the requirements is the exposition of this Apache Parquet dataset to the data analysts team. Unfortunately, when you did your first tests, the execution time was not as good as for the batch job producer. You found out that the slowest operation lists the files to load from your object store, and you would like to avoid this costly step.

#### Solution

To overcome a repeated listing operation problem, it's better to list files only once or not at all if the data producer can record filenames beforehand. That's the premise of the Manifest pattern.

<DiagramContainer title="Without vs With Manifest Pattern">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.red} variant="filled" size="md" icon="🐌">
        Without Manifest
      </Box>
      <Box color={colors.red} variant="outlined" size="sm">
        List API calls
      </Box>
      <Box color={colors.red} variant="outlined" size="sm">
        Every reader lists
      </Box>
      <Box color={colors.red} variant="subtle" size="sm">
        Slow + Expensive
      </Box>
    </Column>

    <Column gap="md" align="center">
      <Box color={colors.green} variant="filled" size="md" icon="⚡">
        With Manifest
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        Read manifest file
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        Direct file access
      </Box>
      <Box color={colors.green} variant="subtle" size="sm">
        Fast + Cheap
      </Box>
    </Column>
  </Row>
</DiagramContainer>

Table file formats such as Delta Lake, Apache Iceberg, and Apache Hudi are the first implementations of the pattern. They write the list of files created within the given transaction to the commit log stored in the metadata location. That way, when a reader needs to access the data files, it can simply get them from the commit files, without performing any listing of the underlying storage. In the context of the Manifest pattern, these commit logfiles act as manifest files, meaning files providing all necessary and important information about the data.

The alternatives to automatically managed manifests are manually created manifests that may require a prior listing operation. They can be particularly useful if many different readers operate on the same dataset, for example, as part of the Fan-Out patterns in Chapter 6.

In addition to their utility in data reading, manifests can play a crucial role in writing. Amazon Redshift uses a manifest file in the COPY command that loads new data into a table. For each loading operation, you can define a different manifest file with a dedicated list of files to upload. This materialization can be incredibly helpful in implementing idempotent pipelines, like the ones in Chapter 4. A similar implementation exists for the Storage Transfer Service on GCP. This offering relies on manifest listings to copy files from other cloud stores to GCS.

> **Insight**
>
> Manifests are the unsung heroes of data lake performance. In object stores like S3, listing operations can take seconds or even minutes for directories with thousands of files. By maintaining a manifest, you convert an O(n) listing operation into an O(1) file read, providing orders of magnitude speedup for data discovery.

#### Consequences

As you can see, the pattern offers efficiency and optimization, but there are trade-offs with complexity and overall size.

**Complexity:**

If you need to add the manifest creation step, you'll add some extra complexity to the execution flow. However, manifest creation is a rather simple operation consisting of listing recently written files. Having this extra complexity in the pipeline should be easier to accept than running a slow and unpredictable listing action many times.

**Size:**

Manifests can grow really big. That's particularly apparent if the input location has many small files or if the data producer is a continuous streaming job. In that case, it's common to see manifests of several gigabytes in size. Some of the implementations may have a maximum size limit for a manifest file or a retention configuration for the entries present in the file.

The size issue was present in the early days of Apache Spark Structured Streaming. When you were using the framework to write files, in addition to creating new files in the output location, the job was adding their names to a manifest file. Over time, the manifests were continuously growing, and sometimes the jobs couldn't even restart because the manifests were too big to restore. Since then, the issue has been fixed (see SPARK-27188).

#### Examples

Let's see how the Manifest pattern can enable two different technologies to work together. The goal of the first example is to create a so-called external table for a Delta Lake dataset in BigQuery. To start, you have to generate the manifest file from Delta Lake. The operation is just a matter of calling a generate function.

**Generating a manifest file in Delta Lake:**

```python
devices_table = DeltaTable.forPath(spark_session, DemoConfiguration.DEVICES_TABLE)
devices_table.generate('symlink_format_manifest')
```

The generated manifest contains all files used by the most recent version of the Delta Lake table (aka snapshot). The next thing to do is to reference this file as part of the external table creation statement.

**External table creation with a Delta Lake manifest file:**

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS `dedp.visits.devices`
...
OPTIONS (
    hive_partition_uri_prefix = "gc://devices",
    uris = ['gc://devices/_symlink_format_manifest/*/manifest'],
    file_set_spec_type = 'NEW_LINE_DELIMITED_MANIFEST',
    format="PARQUET");
```

Another use case of the Manifest pattern occurs in Redshift, which can enforce the idempotency of the COPY command with the list of files to load to the table. If before loading the files, you create the manifest and associate it with the job's execution, you'll be able to use the same manifest file for any replayed job's runs.

**Manifest for data loading in Amazon Redshift:**

```sql
COPY customer
FROM 's3://devices/manifest_20250601_1031'
...
MANIFEST;
```

```json
# manifest_20250601_1031
{"entries": [
 {"url":"s3://devices/dataset_1","mandatory":true},
 {"url":"s3://devices/dataset_2","mandatory":true}]}
```

---

## 5. Data Representation

Data storage is not only about organizing storage or optimizing read performance. Both are crucial steps to make a dataset useful, but they're missing one piece: data representation, which answers the crucial question of what attributes will be stored together and thus what tables you're going to create.

### 5.1. Pattern: Normalizer

The first data representation pattern favors decoupling, which is great for keeping a dataset consistent by not duplicating the information.

#### Quick Reference

| | |
|---|---|
| **What it is** | Structuring data into multiple related tables where each piece of information is stored exactly once, following normal forms or snowflake schema design principles. |
| **When to use** | ✓ Need to reduce data repetition and slow updates ✓ Prioritize data consistency over performance ✓ Transactional workloads with fast-paced writes |
| **Core problem** | Favors data split into multiple places requiring costly JOIN operations in distributed environments, and archival needs for time-sensitive dimension tables. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Normal forms (1NF/2NF/3NF) | Transactional workloads requiring strong consistency |
| Snowflake schema | Analytical workloads with normalized dimensions |
| Broadcast mode for joins | Small dimension tables joining with large fact tables |
| SCD techniques for archival | Need historical tracking of dimension changes |

> 📁 **Full code**: [chapter-08/04-data-representation](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/04-data-representation)

---

#### Problem

You defined a data model for the visit events. A colleague pointed out some data duplication. In fact, your visits table stores event-driven attributes, such as visit time and visited page, but also immutable attributes, such as device name, operating system name, and version. The immutable attributes are repeated for each visit row, leading to increased storage and slow update operations whenever these attributes are modified.

You were asked to review your design and propose a model that addresses the issues of data repetition and slow updates.

#### Solution

In the context of our problem, the separation can be understood as normalization since we try to reduce repetition by representing each piece of information only once. From there comes the name of the next pattern, the Normalizer pattern.

**In plain English:** Think of normalization like organizing a company's employee database. Instead of writing down every employee's department address in their individual record, you create a separate departments table and just reference which department each employee belongs to. This way, if the department moves, you only update one place.

**In technical terms:** The Normalizer pattern structures data into multiple related tables where each piece of information is stored exactly once, eliminating redundancy and ensuring consistency through foreign key relationships and normalization rules.

**Why it matters:** Normalized data prevents update anomalies, reduces storage requirements for redundant information, and ensures data consistency. When you update a product price in a normalized system, it instantly reflects everywhere that product appears.

The Normalizer has two possible implementations called normal forms (NF) and the snowflake schema. Despite their different names and technical details, the two share the same high-level design process that follows these steps:

1. **Defining the business entities.** First, you establish a list of terms involved in your data model. For the sake of our website visits example, the terms could include visits, devices, browsers, and link referrals.
2. **Describing the business entities.** Then you define the attributes of each entity. For example, if the entity you are describing is a browser, its attributes could include the browser name and version.
3. **Defining the relationships among the business entities.** Finally, you define the dependencies between the business entities. For example, a visit would depend on the availability of a browser, while a browser would depend on the availability of an operating system.

<ProcessFlow
  direction="horizontal"
  steps={[
    { title: "Define Entities", description: "Identify business objects", icon: "1", color: colors.blue },
    { title: "Describe Attributes", description: "Define entity properties", icon: "2", color: colors.purple },
    { title: "Define Relationships", description: "Connect entities", icon: "3", color: colors.green }
  ]}
/>

As for the specific implementations, let's start with the NF-based approach. It's widely used in transactional workloads that mainly involve writing operations occurring at a fast pace. The NF design helps eliminate data quality-related issues by reducing duplicates and, consequently, the volume of data to write. The model respects the following forms:

**The first NF:** After you apply this form, the columns of your table should have nonrepeating atomic values, and each row should be uniquely identifiable by a primary key.

**The second NF:** Here, each column must depend only on the primary key. In other words, a nonprimary key attribute must be described by all primary key attributes.

**The third NF:** This form guarantees that there are no transitive dependencies between nonprimary attributes. In other words, all nonprimary columns should depend only on the primary key.

> **Insight**
>
> Even though there are more normal forms beyond the third (such as Boyce-Codd Normal Form, 4NF, and 5NF), the three we just explained are the most commonly used. Knowing them should be enough to implement the Normalizer pattern effectively in most real-world scenarios.

To help you understand these NFs better, let's take a look at three examples, each of which shows a broken version of one of the forms:

**The first NF (broken):**

| Name (primary key) | Comments |
|-------------------|----------|
| Puzzle Tour | ["...", "..."] |
| Runner | ["..."] |

The table contains repeating attributes in the comments column. To normalize this table, you should extract each comment to a dedicated games_comments table.

**The second NF (broken):**

| Name (PK) | Platform (PK) | Release year | Platform language |
|-----------|---------------|--------------|-------------------|
| Puzzle Tour | iOS | 2023 | Swift |
| Puzzle Tour | Android | 2024 | Kotlin |
| Runner | Android | 2024 | Kotlin |

Here, you have a table with a composite primary key. The platform language only depends on the game platform, not the full composite key. To normalize this table, we should create a new table in which we store the platform and the platform language.

**The third NF (broken):**

| Name (PK) | Studio | Studio country |
|-----------|--------|----------------|
| Puzzle Tour | Studio A | Italy |
| Runner | Studio B | Portugal |

This table breaks the third NF because of a transitive dependency. The studio country column's value doesn't depend on the game's name but on the studio's name. To fix that, we should create a new studios table and put all related information inside it.

The NF model was the first implementation of the Normalizer pattern. Even though this model is often used in transactional workloads of relational databases, it also has a dimensional model variant that's present in analytical workloads. In a nutshell, a dimensional model is a design composed of one fact table and multiple dimension tables. A fact table represents an observation, such as an ecommerce order or a website visit, while a dimension table describes the observation by providing extra context, such as product information for the order or the browser configuration for the visit.

One of the dimensional models, and another implementation of the Normalizer pattern, is the snowflake model. In this model, the fact table is described by multiple dimension tables that in turn can be described by other dimension tables.

<DiagramContainer title="Snowflake Schema">
  <Column gap="md" align="center">
    <Row gap="md">
      <Column gap="sm" align="center">
        <Box color={colors.blue} variant="outlined" size="sm">dim_quarter</Box>
        <Arrow direction="down" />
        <Box color={colors.blue} variant="outlined" size="sm">dim_month</Box>
        <Arrow direction="down" />
        <Box color={colors.blue} variant="filled" size="md">dim_date</Box>
      </Column>

      <Column gap="sm" align="center">
        <Box color={colors.purple} variant="outlined" size="sm">dim_category</Box>
        <Arrow direction="down" />
        <Box color={colors.purple} variant="filled" size="md">dim_page</Box>
      </Column>
    </Row>

    <Row gap="md">
      <Arrow direction="down" label="describes" />
      <Arrow direction="down" label="describes" />
    </Row>

    <Box color={colors.green} variant="filled" size="lg" icon="📊">
      fact_visit
    </Box>
  </Column>
</DiagramContainer>

As you can see, one dimension like the date can be normalized into subdimensions, such as quarters or months. The snowflake model tends to move attributes repeated multiple times to a dedicated subdimension table.

From both NFs and the snowflake model, you can see that the most important goal of the Normalizer pattern is to prioritize data consistency over any eventual performance optimizations. This means easier updates since any given update will be immediately reflected in all related tables.

> **Insight**
>
> Normalization is fundamentally about managing truth. In a normalized system, each fact exists in exactly one place - there's a single source of truth. This makes updates trivial but reads complex. Denormalization does the opposite: it makes reads simple but updates complex. Your choice depends on your read/write ratio and consistency requirements.

#### Consequences

Complexity is one of the biggest drawbacks here, but that's the price you have to pay if you need to keep the data consistent.

**Query cost:**

The Normalizer pattern favors data split into multiple places. That translates into relying often on JOIN operations for querying data. Unfortunately, joins can be costly in a distributed environment as they involve exchanging data across the network.

Even though that's the price you have to pay for better data consistency, there are technical solutions that can reduce network traffic, such as colocating smaller dimension or entity tables with bigger ones, so that the joining remains local to the node.

Another mitigation technique consists of using the broadcast mode (sending these smaller tables to all compute nodes to avoid other, usually more expensive data distribution methods).

> **Warning**
>
> The easiest approach to broadcasting a big table is to reduce its size by applying filters. If that's not possible, you can eventually try to configure your data processing layer to broadcast tables of larger size. In Apache Spark, you can control that part with the `spark.sql.autoBroadcastJoinThreshold` property.

**Archival:**

The next challenge comes from archival needs. A dimension or entity table can be time sensitive. For example, our product table may have different prices over the years, and from your query layer, you may want to find out what the price was on a specific date.

You can easily mitigate this issue with the SCD techniques we introduced while exploring the Static Joiner pattern in Chapter 5.

#### Examples

First, you're going to see the NF. The diagram below demonstrates how to create tables for a visit event from our use case dataset. As you can see, there are many tables you can create.

<DiagramContainer title="Normalized Visit Tables">
  <Row gap="md" wrap={true}>
    <Box color={colors.green} variant="filled" size="md">visits</Box>
    <Box color={colors.blue} variant="outlined" size="sm">visits_context</Box>
    <Box color={colors.purple} variant="outlined" size="sm">pages</Box>
    <Box color={colors.purple} variant="outlined" size="sm">categories</Box>
    <Box color={colors.cyan} variant="outlined" size="sm">users</Box>
    <Box color={colors.orange} variant="outlined" size="sm">browsers</Box>
    <Box color={colors.orange} variant="outlined" size="sm">devices</Box>
    <Box color={colors.pink} variant="outlined" size="sm">ads</Box>
  </Row>
</DiagramContainer>

There are some important things to notice here. First, browsers and devices attributes are on dedicated tables. They can't be part of the visits_context table since the browser or device doesn't depend on the visit. They're different entities that can be shared across different visits. Second, the records on the visits_contexts table are not on the visits table because putting them there would involve repeating groups and thus break the first NF.

As you can see from the diagram, if you want to get a full picture of a visit, your query will be verbose.

**Joining normalized datasets:**

```python
context = (visits_context
 .join(ads, visits_context.ads_id == ads.id, 'left_outer').drop('id')
 .join(browser, visits_context.browsers_id == browser.id, 'left_outer').drop('id')
 .join(device, visits_context.devices_id == device.id, 'left_outer').drop('id'))

page_with_category = (pages.withColumnRenamed('id', 'page_id')
  .join(categories, pages.page_categories_id == categories.id, 'left_outer')
   .drop('id').withColumnRenamed('page_id', 'id'))

full_visit = (visits
 .join(context, visits.visit_id_event == context.visit_id, 'left_outer')
 .drop('visit_id_event')
 .join(users, visits.users_id == users.id, 'left_outer').drop('id')
 .join(page_with_category, visits.pages_id == page_with_category.id, 'left_outer')
 .drop('id').withColumnRenamed('visit_id', 'id')
)
```

From that, you can deduce that the fully normalized datasets are not easily queryable and may not perform well on big datasets due to the number of joins. You'll encounter the same problem while designing a snowflake model for our visits use case. Overall, to get the full picture of a visit, the model still requires a lot of joins.

**Querying overhead for a simplified snowflake schema for visits:**

```python
page_w_category = dim_page.join(dim_page_category,
 dim_page.dim_page_category_id == dim_page_category.page_category_id,
 'left_outer')
date_with_month_and_quarter = (dim_date
 .join(dim_date_month, dim_date.dim_month_id == dim_date_month.month_id,
  'left_outer')
 .join(dim_date_quarter, dim_date.dim_quarter_id == dim_date_quarter.quarter_id,
  'left_outer'))

full_visit = (fact_visit
 .join(page_w_category, fact_visit.dim_page_id == page_w_category.page_id,
  'left_outer')
 .join(date_with_month_and_quarter
  fact_visit.dim_date_id == date_with_month_and_quarter.date_id,
  'left_outer')
)
```

### 5.2. Pattern: Denormalizer

Knowing that joins can be costly, a simple optimization technique is to reduce or avoid them. Unfortunately, that causes side effects that you'll learn more about in a few minutes, after discovering the next pattern.

#### Quick Reference

| | |
|---|---|
| **What it is** | Flattening values from all joined tables into a single row to eliminate joins, either as regular columns or nested structures (STRUCT types). |
| **When to use** | ✓ Expensive queries joining many tables repeatedly ✓ Analytical workloads prioritizing read performance ✓ 80% of queries involve same table joins |
| **Core problem** | Updates become costly as duplicated attributes require changing multiple rows, storage overhead from repeated information, and risk of becoming "trash bag" antipattern. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| One Big Table (regular columns) | All attributes accessed as top-level columns |
| Star schema (flattened dimensions) | Dimensions with subdimensions flattened into one level |
| Nested structures (STRUCT) | Want to group related attributes in complex types |
| Combined Normalizer + Denormalizer | Write normalized, read denormalized for consistency + speed |

> 📁 **Full code**: [chapter-08/04-data-representation](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-08/04-data-representation)

---

#### Problem

You were called to help a company that implemented a relational model on top of their data warehouse storage for analytics. They didn't notice any issues in the first few months, as the data volume was low. But then their product became incredibly successful, and their data analytics department started to complain about the query execution time.

You performed your preliminary analysis and learned that the most expensive solution involves joining all eight of the tables involved in 80% of queries. Thanks to your previous experience, you have an idea how to create a better solution for the issue.

#### Solution

The stated problem is a typical scenario where the Denormalizer pattern can help. Unlike the Normalizer, it tends to reduce and even eliminate all joins from the query.

The elimination approach consists of flattening values from all joined tables into a single row so that there is no need to exchange data across the network. How? There are two different ways to do it:

**Just as regular columns:** Here, each column from the joined tables is copied as is. A user can access them directly as top-level columns from a SELECT statement.

**As nested structures:** In this approach, all rows from the joined tables can be put into one column in the target table. Typically, you will rely on the STRUCT type that's available in modern data stores to represent complex types. As a result, the user will need to access the attributes of this column instead of accessing the column directly.

An example of the first implementation could be storing the visits from our use case alongside referential datasets, such as users and devices, in the same table. This design approach is also known as One Big Table.

**Denormalized visits table:**

| visit_id | user_id | user_name | device_id | device_full_name | visit_time | visited_page |
|----------|---------|-----------|-----------|------------------|------------|--------------|
| 1 | 409 | user ABC | 10000 | local computer | 2024-07-01T09:00:00Z | home.html |

In the second approach, the Denormalizer pattern reduces the number of joins by flattening related tables. This is typically the usage in dimensional models with the star schema. Although the star schema also uses the fact and dimension tables, unlike the snowflake schema, it doesn't accept nested dimensions. Put differently, dimensions describing other dimensions are now present in the highest-level dimension table.

<DiagramContainer title="Star Schema">
  <Column gap="md" align="center">
    <Row gap="lg">
      <Box color={colors.blue} variant="filled" size="md">
        dim_date (with month, quarter)
      </Box>
      <Box color={colors.purple} variant="filled" size="md">
        dim_page (with category)
      </Box>
    </Row>

    <Row gap="md">
      <Arrow direction="down" label="describes" />
      <Arrow direction="down" label="describes" />
    </Row>

    <Box color={colors.green} variant="filled" size="lg" icon="📊">
      fact_visit
    </Box>
  </Column>
</DiagramContainer>

With the Denormalizer pattern, the query cost is significantly lower, thanks to the reduced network traffic needs.

The Normalizer and Denormalizer patterns are not exclusive, though. If you still care about consistency, you can apply one of the Normalizer's models first and create the denormalized version on top of it for querying. To keep them in sync, you can leverage one of the sequence design patterns covered in Chapter 6.

<DiagramContainer title="Combining Normalizer and Denormalizer">
  <Row gap="lg">
    <Column gap="md" align="center">
      <Box color={colors.blue} variant="filled" size="md" icon="📝">
        Write Path
      </Box>
      <Box color={colors.blue} variant="outlined" size="sm">
        Snowflake Schema (Normalized)
      </Box>
      <Box color={colors.blue} variant="subtle" size="sm">
        Single source of truth
      </Box>
    </Column>

    <Arrow direction="right" label="transform" />

    <Column gap="md" align="center">
      <Box color={colors.green} variant="filled" size="md" icon="📖">
        Read Path
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        One Big Table (Denormalized)
      </Box>
      <Box color={colors.green} variant="subtle" size="sm">
        Optimized for queries
      </Box>
    </Column>
  </Row>
</DiagramContainer>

> **Insight**
>
> The best data architectures often use both patterns strategically. Normalize your source of truth to ensure consistency, then create denormalized materialized views or tables for query performance. This "write normalized, read denormalized" pattern gives you both consistency and speed.

#### Consequences

Even though the Denormalizer optimizes data access, it sacrifices data consistency.

**Costly updates:**

Since all attributes are now duplicates, updating one will potentially require changing multiple rows instead of one in cases of normalized storage. This is technically feasible but will be more expensive than the normalized approach.

There is no magic solution to mitigate the issue. The only viable mitigation strategy relies on what you consider the denormalized table to be. If you consider it to be a snapshot (what your data looked like at a specific point in time), you will not need any updates. Otherwise, you may simply need to accept the fact that you need to perform a more expensive update operation to have quicker response times.

**Storage:**

Storage is another concern. You will probably repeat the same information from the joined tables multiple times, which may end up taking up some space in your database. Fortunately, there are various encoding techniques that can reduce the storage footprint.

A popular and easy space-optimizing encoding strategy involves using a dictionary. The dictionary builds a mapping between the real values and their more compact representation, and it uses the compact values in the columns. An example of such a mapping would be transforming long string columns into integers, such as `{1: "long name...", 2: "long name, next...", ...}`. In addition to saving space, these techniques can improve performance. For example, the query engine may decide to check for the existence of a value by verifying the dictionary instead of reading the dataset.

> **Warning**
>
> The One Big Table solution, despite its good intentions of flattening records and reducing query time, can end up as an antipattern if it doesn't follow any domain-oriented logic. If you find yourself combining unrelated attributes (like user details, past orders, current visit, and favorite color), you're creating a "trash bag" table. Use your domain knowledge and try naming the table - if you need many "and" or "with" conjunctions, you've probably combined too many unrelated attributes.

**One big antipattern:**

The One Big Table solution, despite its good intentions of flattening records and reducing query time, can end up as an antipattern if it doesn't follow any domain-oriented logic. Let's take a look at an example of the One Big Table group's attributes, such as a user's details, a list of their past orders, columns for their current visit to our website, and finally, their favorite color.

If the user's favorite color and past orders have nothing to do with the visit, One Big Table ends up as a trash bag that you put things into, but from outside, you don't really know what's inside.

How can you know when to stop while choosing attributes to combine? Your intuition about the domain knowledge should help here. If you don't know it that well, a good exercise is to try to give a name to the table. If you end up using a lot of conjunctions such as "and" or "with", it may be a sign that you've put too many unrelated attributes together.

#### Examples

The first example of the Denormalizer pattern is One Big Table that combines all related elements and stores them in the same table. Creating this table can be costly, but the good news is that you pay the cost only once per update operation. All subsequent readers will take advantage of it and experience much faster operations.

**Writing and reading One Big Table:**

```python
# writing
page_w_category = dim_page.join(dim_page_category,
 dim_page.dim_page_category_id == dim_page_category.page_category_id,
   'left_outer')
date_w_month_quarter = (dim_date
 .join(dim_date_month, dim_date.dim_month_id == dim_date_month.month_id,
   'left_outer')
 .join(dim_date_quarter, dim_date.dim_quarter_id == dim_date_quarter.quarter_id,
   'left_outer'))

full_visit = (fact_visit
 .join(page_w_category, fact_visit.dim_page_id == page_w_category.page_id,
  'left_outer')
 .join(date_w_month_quarter, fact_visit.dim_date_id == date_w_month_quarter.date_id,
  'left_outer')
)

full_visit.write.mode('overwrite').format('delta').save(get_one_big_table_dir())

# reading
visits_table = spark_session.read.format('delta').load(get_one_big_table_dir())
```

When it comes to a slightly normalized denormalization storage, the star schema, the writing step creates more tables, which also has an impact on the reading step that requires joins. That was not the case previously as all combined data was flattened.

**Writing and reading for a star schema:**

```python
# writing
page_with_category = dim_page.join(dim_page_category,
  dim_page.dim_page_category_id == dim_page_category.page_category_id,
  'left_outer').dropDuplicates()
page_with_category.write.mode('overwrite').format('delta').save(output_page)

date_with_month_and_quarter = (dim_date
 .join(dim_date_month, dim_date.dim_month_id == dim_date_month.month_id,
 'left_outer')
 .join(dim_date_quarter, dim_date.dim_quarter_id == dim_date_quarter.quarter_id,
 'left_outer')).dropDuplicates()
(date_with_month_and_quarter.write.mode('overwrite').format('delta')
  .save(output_date_dir))

visits_dataset = (spark_session.read
  .schema('visit_id STRING, event_time TIMESTAMP,  page STRING')
  .format('json').load(input_visits_dir))
fact_visit = (visits_dataset.selectExpr(
 'visit_id', 'HASH(page) AS dim_page_id',
  'HASH(TO_DATE(event_time)) AS dim_date_id',
  'DATE_FORMAT(event_time, "HH:mm:ss") AS event_time'
))
fact_visit.write.mode('overwrite').format('delta').save(output_visits_dir)

# reading
fact_visit = spark_session.read.format('delta').load(output_visits_dir)
dim_date = spark_session.read.format('delta').load(output_date_dir)
dim_page = spark_session.read.format('delta').load(output_page_dir)

full_visit = (fact_visit
  .join(dim_date, fact_visit.dim_date_id == dim_date.date_id, 'left_outer')
  .join(dim_page, [fact_visit.dim_page_id == dim_page.page_id], 'left_outer'))
```

---

## 6. Summary

In this chapter, you learned about data storage design patterns. The first section was dedicated to partitioning strategies. You saw two approaches, horizontal and vertical. The horizontal approach operates on whole rows and is a good candidate for low-cardinality values, such as event time values. Vertical partitioning works at the attributes level, so it splits one row into multiple parts stored in different places.

<CardGrid
  columns={3}
  cards={[
    {
      title: "Partitioning",
      icon: "📁",
      color: colors.blue,
      items: [
        "Horizontal: Whole rows by time/region",
        "Vertical: Split attributes across tables",
        "Low-cardinality keys work best"
      ]
    },
    {
      title: "Organization",
      icon: "🗂️",
      color: colors.purple,
      items: [
        "Bucket: High-cardinality grouping",
        "Sorter: Ordered storage for skipping",
        "Z-order: Multi-column optimization"
      ]
    },
    {
      title: "Optimization",
      icon: "⚡",
      color: colors.green,
      items: [
        "Metadata: Skip irrelevant data",
        "Materializer: Pre-compute results",
        "Manifest: Avoid costly listing"
      ]
    }
  ]}
/>

Although partitioning is a great data storage optimization strategy, it won't work well for high-cardinality values, such as last names or cities. Here, a better approach will be the Bucket pattern that groups multiple similar rows into containers called buckets. Additionally, you can leverage a Sorter to enable faster processing on top of sorted data.

The third section covered other access optimization strategies. The first of them is Metadata Enhancer, which tries to reduce the volume of data to process by filtering out irrelevant files or rows from the metadata layer. Next, you saw the Dataset Materializer pattern, which is ideal for materializing complex queries and thus optimizing the reading path by sacrificing storage. Finally, you saw the Manifest pattern, which you can use to mitigate often costly listing operations.

In the last section, you saw two data representation patterns. The first is the Normalizer pattern, which favors data consistency but involves joins. The alternative is the Denormalizer pattern, which introduces a risk of data inconsistency but completely eliminates the need for joining multiple datasets.

<ComparisonTable
  beforeTitle="Normalizer"
  afterTitle="Denormalizer"
  beforeColor={colors.blue}
  afterColor={colors.green}
  items={[
    { label: "Data Consistency", before: "Strong - Single source of truth", after: "Weak - Duplicated data" },
    { label: "Query Performance", before: "Slower - Multiple joins", after: "Faster - Pre-joined data" },
    { label: "Update Cost", before: "Low - Single location", after: "High - Multiple locations" },
    { label: "Storage", before: "Efficient - No duplication", after: "Higher - Duplicated data" },
    { label: "Best For", before: "Transactional systems", after: "Analytical queries" }
  ]}
/>

> **Insight**
>
> Even the best-optimized storage won't be enough to guarantee that other people will use your data. You also need to provide data of the best possible quality, and that's what the next chapter will be about.

### Key Takeaways

1. **Partitioning first** - Start with horizontal partitioning by time or low-cardinality business keys to divide your dataset into manageable chunks
2. **Bucket high-cardinality** - Use bucketing for high-cardinality columns that partitioning can't handle efficiently
3. **Sort strategically** - Apply sorting to columns commonly used in filters; use Z-order for multi-column scenarios
4. **Leverage metadata** - Use columnar formats like Parquet to automatically enable metadata-based data skipping
5. **Materialize wisely** - Pre-compute expensive queries that run frequently, balancing storage cost against query performance
6. **Manifest for scale** - Use manifest files to avoid costly listing operations in object stores with many files
7. **Normalize for consistency** - Use normalized models when data consistency and easy updates are critical
8. **Denormalize for speed** - Flatten data for analytical workloads where read performance matters more than update efficiency
9. **Combine patterns** - Write to normalized tables, then materialize denormalized views for optimal balance
10. **Storage isn't enough** - Even perfectly organized data is useless if quality is poor - data quality patterns are next

---

**Previous:** [Chapter 7: Data Security Design Patterns](./chapter7) | **Next:** [Chapter 9: Data Quality Design Patterns](./chapter9)
