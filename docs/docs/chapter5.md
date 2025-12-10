---
sidebar_position: 5
title: "Chapter 5: Data Value Design Patterns"
description: "Transform raw data into valuable assets through enrichment, decoration, aggregation, sessionization, and ordering patterns that enhance data usability and insights."
---

import { Box, Arrow, Row, Column, Group, DiagramContainer, ProcessFlow, TreeDiagram, CardGrid, StackDiagram, ComparisonTable, colors } from '@site/src/components/diagrams';
import PythonRunner from '@site/src/components/PythonRunner';
import CodeRunner from '@site/src/components/CodeRunner';

# Chapter 5: Data Value Design Patterns

> **"Data sitting in storage is not an asset—it becomes valuable only when enhanced, aggregated, and made actionable."**
>
> — The data value transformation principle

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Enrichment](#2-data-enrichment)
   - 2.1. [Pattern: Static Joiner](#21-pattern-static-joiner)
   - 2.2. [Pattern: Dynamic Joiner](#22-pattern-dynamic-joiner)
3. [Data Decoration](#3-data-decoration)
   - 3.1. [Pattern: Wrapper](#31-pattern-wrapper)
   - 3.2. [Pattern: Metadata Decorator](#32-pattern-metadata-decorator)
4. [Data Aggregation](#4-data-aggregation)
   - 4.1. [Pattern: Distributed Aggregator](#41-pattern-distributed-aggregator)
   - 4.2. [Pattern: Local Aggregator](#42-pattern-local-aggregator)
5. [Sessionization](#5-sessionization)
   - 5.1. [Pattern: Incremental Sessionizer](#51-pattern-incremental-sessionizer)
   - 5.2. [Pattern: Stateful Sessionizer](#52-pattern-stateful-sessionizer)
6. [Data Ordering](#6-data-ordering)
   - 6.1. [Pattern: Bin Pack Orderer](#61-pattern-bin-pack-orderer)
   - 6.2. [Pattern: FIFO Orderer](#62-pattern-fifo-orderer)
7. [Summary](#7-summary)

---

## 1. Introduction

**In plain English:** Raw data is like uncut diamonds—valuable in potential but requiring transformation to reveal true worth. Data value patterns polish your data into actionable insights.

**In technical terms:** Data value design patterns transform raw ingested data through enrichment, decoration, aggregation, and ordering operations to increase usability, reduce complexity, and enable better decision-making for downstream consumers.

**Why it matters:** Most data arrives poor quality with limited context. Without augmentation, correlating events, understanding user behavior, or deriving meaningful insights becomes impossible. These patterns bridge the gap between raw ingestion and business value.

Let's revisit our blog analytics use case. Visit events from web browsers contain technical information like browser version and operating system, but lack deeper context. What do visitors using a specific browser have in common? Each visit is a distinct, unrelated item—correlation requires extra effort.

<CardGrid
  columns={3}
  cards={[
    {
      title: "Enrichment Patterns",
      icon: "🔗",
      color: colors.blue,
      items: ["Combine datasets", "Add context", "Join static/dynamic data"]
    },
    {
      title: "Aggregation Patterns",
      icon: "📊",
      color: colors.purple,
      items: ["Summarize volumes", "Generate sessions", "Create analytics cubes"]
    },
    {
      title: "Ordering Patterns",
      icon: "⏱️",
      color: colors.green,
      items: ["Guarantee sequence", "Handle partial commits", "FIFO delivery"]
    }
  ]}
/>

This chapter covers solutions to augment datasets by combining sources (Data Enrichment and Data Decoration), summarizing large volumes (Data Aggregation and Sessionization), and preserving record order (Data Ordering patterns).

---

## 2. Data Enrichment

**In plain English:** Enrichment is like adding footnotes and references to a short message—it transforms sparse information into comprehensive context by combining it with reference data.

**In technical terms:** Data enrichment patterns augment event streams or raw datasets with additional contextual information from reference datasets, APIs, or slowly changing dimensions to create more meaningful analytical datasets.

**Why it matters:** Raw events capture time and space attributes but rarely include extended context like user profiles, historical behavior, or related entities. Enrichment makes data useful for diverse stakeholders by adding this missing context.

> **Insight**
>
> Events are perfect representations of "what happened when" but terrible at explaining "who they happened to" in detail. Enrichment bridges this gap by bringing reference data to your event streams.

### 2.1. Pattern: Static Joiner

**In plain English:** Static Joiner is like looking up a word in a dictionary—you match your data against a reference book that doesn't change during the lookup process.

**In technical terms:** The Static Joiner pattern combines datasets by joining streaming or batch data with at-rest reference datasets using key-based conditions, optionally including temporal constraints for slowly changing dimensions.

**Why it matters:** When your enrichment dataset is relatively stable (users, products, devices), static joins provide a simple, efficient way to add context without complex state management.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that combines datasets by joining streaming or batch data with at-rest reference datasets using key-based conditions. |
| **When to use** | ✓ Enrichment dataset has static or slowly changing nature ✓ Need to add user, product, or device context to events ✓ Works for both batch and streaming pipelines |
| **Core problem** | Late data and consistency—users may evolve at different pace than events are produced, and idempotency challenges arise when backfilling or replaying processing logic. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| SQL JOIN with keyed conditions | Standard enrichment with stable reference data |
| SCD Type 2 (validity dates) | Time-sensitive enrichment requiring historical context |
| Materialized API datasets | Need idempotency guarantees for external API data |

> 📁 **Full code**: [chapter-05/01-data-enrichment](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/01-data-enrichment)

---

#### Problem

Your team's datasets are extensively used by business stakeholders. For a new project, you need to create a dataset that simplifies understanding the dependency between user registration dates and daily activity.

Unfortunately, your raw dataset doesn't include user context—you can find it only in a static user reference dataset. You need a way to bring reference data to user activity.

#### Solution

The at-rest character of the joined dataset presents perfect conditions for using the Static Joiner pattern. Despite the at-rest nature of enrichment data, the pattern works for both batch and streaming pipelines.

<DiagramContainer title="Static Joiner Architecture">
  <Column gap="lg">
    <Row gap="md" align="center">
      <Box color={colors.blue} icon="📊">Dynamic Dataset (Visits)</Box>
      <Arrow direction="right" />
      <Box color={colors.purple} icon="🔗">JOIN Operation</Box>
      <Arrow direction="right" />
      <Box color={colors.green} icon="✅">Enriched Output</Box>
    </Row>
    <Row gap="md" align="center">
      <Box color={colors.slate} icon="📚">Static Dataset (Users)</Box>
      <Arrow direction="up" />
    </Row>
  </Column>
</DiagramContainer>

The implementation requires identifying attributes from both datasets that combine them. In our example, it could be any field identifying a user in the visits and users datasets, such as the `user_id` field.

**Key Implementation Points:**

1. **Keyed condition:** Match records using shared identifiers
2. **Time-sensitive variation:** For slowly changing dimensions, add temporal constraints
3. **Implementation methods:**
   - SQL JOIN statements (universal across frameworks)
   - Programmatic API calls (HTTP libraries for external APIs)
   - Materialized API datasets (pre-fetch and join as tables)

<DiagramContainer title="API Enrichment Approaches">
  <ComparisonTable
    beforeTitle="Real-time API"
    afterTitle="Synchronized API"
    beforeColor={colors.orange}
    afterColor={colors.green}
    items={[
      { label: "Speed", before: "Slower per record", after: "Faster (batch reads)" },
      { label: "Idempotency", before: "Not guaranteed", after: "Guaranteed with SCD" },
      { label: "Complexity", before: "Simple setup", after: "Requires materialization" },
      { label: "Consistency", before: "May vary on replay", after: "Same results on replay" }
    ]}
  />
</DiagramContainer>

> **Insight**
>
> **Slowly Changing Dimensions (SCD):** Track entity evolution over time. SCD Type 2 uses validity dates (start_date, end_date) in one table. SCD Type 4 uses two tables—current values in one, historical values in another. Both enable time-sensitive enrichment for backfilling scenarios.

When you care about idempotency, materialize the API as a table and leverage SCD forms. This guarantees that replaying processing logic always uses the same dataset.

#### Consequences

Even though implementation looks simple, several gotchas exist:

**Late data and consistency**

In an ideal scenario, users would evolve at the same pace as events are produced. A user performs a profile change, immediately navigates, and the processed visit includes recent changes. Unfortunately, as discussed in Chapter 3, this scenario may not happen.

Mitigation strategies:
- **Streaming pipelines:** Use the Dynamic Joiner pattern (presented next) for dynamic enrichment datasets
- **Batch pipelines:** Leverage orchestration to wait for enrichment dataset presence (using the Readiness Marker pattern from Chapter 2)

**Idempotency**

When backfilling batch pipelines, ask whether the outcome must be idempotent for the enrichment dataset. If yes and the data provider doesn't support time-based queries, bring the enrichment dataset into your data layer to control temporal aspects before joining.

For external datasets behind APIs, ideally issue time-based queries. If impossible, add temporality to your internal data store by writing all enrichment records there with SCD.

> **Warning**
>
> Streaming jobs don't wait for static datasets to update. If combining with full-rewriting datasets (JSON/CSV), you risk joining with empty tables during writes. Use table file formats (Delta, Iceberg) that provide atomicity and consistency guarantees.

#### Examples

**SCD Type 2 Implementation**

Let's start with SCD Type 2, which requires more effort than simple joins:

<CodeRunner
  language="sql"
  title="SCD Type 2: Table Definitions"
  code={`-- Users table with temporal validity
CREATE TABLE dedp.users (
  id TEXT NOT NULL,
  login VARCHAR(45) NOT NULL,
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL DEFAULT '9999-12-31'::timestamp,
  PRIMARY KEY(id, start_date)
);

-- Visits table
CREATE TABLE dedp.visits (
  visit_id CHAR(36) NOT NULL,
  event_time TIMESTAMP NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY(visit_id, event_time)
);`}
/>

The `users` table is a slowly evolving reference dataset enriching the more dynamic visits dataset. The `start_date` and `end_date` columns define attribute validity for each user:

<CodeRunner
  language="sql"
  title="SCD Type 2: Join Query"
  code={`SELECT
  v.visit_id,
  v.event_time,
  v.page,
  u.id,
  u.login,
  u.email
FROM dedp.visits v
JOIN dedp.users u
  ON u.id = v.user_id
  AND NOW() BETWEEN start_date AND end_date;`}
/>

The condition uses `NOW()` for ad hoc queries to get current dataset state. You can use any date fitting your needs—for example, execution time provided by your data orchestrator, which is an immutable property helping enforce idempotency.

**Stream-to-Batch Join in PySpark**

Combining batch and streaming datasets in Apache Spark relies on the same API as regular batch joins:

<PythonRunner
  title="Stream-to-Batch Join in PySpark"
  code={`# Load static reference dataset
devices = spark.read.format('delta').load('/path/to/devices')

# Load streaming dataset
visits = (spark.readStream
  .format('kafka')
  .option('kafka.bootstrap.servers', 'localhost:9092')
  .option('subscribe', 'visits')
  .load())

# Perform join
enriched_visits = visits.join(
  devices,
  [visits.device_type == devices.type,
   visits.device_version == devices.version],
  'left_outer'
)

# Write to output
(enriched_visits.writeStream
  .format('delta')
  .option('checkpointLocation', '/checkpoints/visits')
  .start('/output/enriched_visits'))`}
/>

This operation combines the static `devices` reference dataset with streaming `visits`. It doesn't include temporal conditions because `devices` is insert-only, and missing matched records are fine (left join used).

The `devices` table relies on a table file format providing atomicity and consistency guarantees. Unless the consumer reads uncommitted files, there's no risk of processing empty tables due to concurrency issues.

**API Enrichment with Bulk Operations**

You can also combine raw datasets with data exposed from APIs. A key recommendation: leverage bulk operations where you ask for information on multiple items at once, optimizing network throughput:

<PythonRunner
  title="PySpark Writer with API Enrichment"
  code={`import requests
import json

class KafkaWriterWithEnricher:
    BUFFER_THRESHOLD = 100

    def __init__(self):
        self.buffered_to_enrich = []
        self.enriched_ips = {}

    def process(self, row):
        if len(self.buffered_to_enrich) == self.BUFFER_THRESHOLD:
            self._enrich_ips()
            self._flush_records()
        else:
            self.buffered_to_enrich.append(row)

    def _enrich_ips(self):
        # Get unique IPs not yet enriched
        ips = ','.join(set(
            visit.ip for visit in self.buffered_to_enrich
            if visit.ip not in self.enriched_ips
        ))

        # Bulk API call for multiple IPs
        response = requests.get(
            f'http://localhost:8080/geolocation/fetch?ips={ips}',
            headers={'Content-Type': 'application/json', 'Charset': 'UTF-8'}
        )

        if response.status_code == 200:
            mapped_ips = json.loads(response.content)['mapped']
            self.enriched_ips.update(mapped_ips)

    def _flush_records(self):
        # Write enriched records to Kafka
        for visit in self.buffered_to_enrich:
            visit_with_geo = {**visit, 'geo': self.enriched_ips.get(visit.ip)}
            # kafka_producer.send(visit_with_geo)
        self.buffered_to_enrich = []`}
/>

The code buffers records, and once the buffer reaches the threshold, makes an API call with a unique list of IPs, significantly reducing network overhead.

---

### 2.2. Pattern: Dynamic Joiner

**In plain English:** Dynamic Joiner is like coordinating with a friend who's always running late—you need to wait at the meeting spot for a while, giving them time to catch up before deciding they're not coming.

**In technical terms:** The Dynamic Joiner pattern combines two streaming datasets using time-bounded buffers and watermarks to handle latency differences between data sources, ensuring maximum join success despite varying arrival times.

**Why it matters:** When both datasets are in motion with different latencies, static joins produce too many misses. Dynamic joins use buffering strategies to align temporal semantics and maximize matching.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that combines two streaming datasets using time-bounded buffers and watermarks to handle latency differences between data sources. |
| **When to use** | ✓ Both datasets are streaming and in motion ✓ Enrichment dataset has different latency than primary dataset ✓ Need to maximize join success rate despite timing differences |
| **Core problem** | Space versus exactness trade-off—increasing buffer space improves join success but costs more hardware resources; reducing space optimizes storage but may miss joins if latency difference is too big. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Time-bounded buffers with watermarks | Standard streaming joins with different latencies |
| Temporal table joins (Flink) | More managed approach for streaming data sources |
| GC watermark configuration | Balance between buffer size and late data tolerance |

> 📁 **Full code**: [chapter-05/01-data-enrichment](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/01-data-enrichment)

---

#### Problem

Even though you've implemented the Static Joiner for users-to-visits, you're still not satisfied. With thousands of new users weekly, profile changes have increased. The enriched dataset is becoming irrelevant and problematic for downstream consumers.

Since each user change is registered to a streaming broker from the Change Data Capture pattern, you're looking for a better way to combine events from both sides.

#### Solution

As both datasets are in motion, you can't use the Static Joiner. Instead, consider the Dynamic Joiner pattern, better suited for that kind of data.

<DiagramContainer title="Dynamic Joiner with Buffer Management">
  <Column gap="lg">
    <Row gap="md" align="center">
      <Box color={colors.blue} icon="⚡">Stream A (Fast)</Box>
      <Arrow direction="right" />
      <Box color={colors.purple} icon="⏸️">Buffer</Box>
    </Row>
    <Row gap="md" align="center">
      <Box color={colors.cyan} icon="🐌">Stream B (Slow)</Box>
      <Arrow direction="right" />
      <Box color={colors.purple} icon="🔗">Join Logic</Box>
      <Arrow direction="right" />
      <Box color={colors.green} icon="✅">Matched Results</Box>
    </Row>
    <Row gap="md" align="center">
      <Box color={colors.orange} icon="🗑️">GC Watermark</Box>
      <Arrow direction="up" label="cleans old" />
    </Row>
  </Column>
</DiagramContainer>

Even though implementation shares points with Static Joiner (key identification, join method definition), there's one extra requirement: **time boundaries**.

Without dedicated time management, many joins will be empty. Why? The two datasets may have different latencies—the enrichment dataset can be late compared to the enriched dataset or vice versa.

**Time-Bounded Buffers**

Defining time conditions implies having time-bounded buffers for joined records on both streams. The faster data source can align its time semantics with the slower source. The buffer gives extra time for joins to happen—typically the allowed latency difference between sources.

Example: If users are one hour late compared to visits, the buffer stores visits for an extra hour, hoping to find matches once the user stream catches up.

**Garbage Collection Watermark**

The buffer involves a streaming aspect called the garbage collection (GC) watermark. While you could keep events forever, this requires significant hardware resources and eventually fails without infinite scaling.

A better approach: define when events that are too old should go away from each buffer using a GC watermark. This means losing joins if records come really late, but that's the trade-off for manageable buffer size.

> **Insight**
>
> The GC watermark is responsible for cleaning the buffer of elements that are too old. It works with watermarks (covered in the Late Data Detector pattern) to determine when buffered records should be discarded because their counterpart is unlikely to arrive.

Data processing frameworks natively implement the entire buffering logic, so you won't need to handle it manually.

#### Consequences

Even though it addresses Static Joiner's major issues, Dynamic Joiner has its own drawbacks:

**Space versus exactness trade-off**

Due to GC watermarks and time boundaries, you may not get all possible joins. You can optimize efficiency by increasing buffer space, but it costs more hardware resources. Reducing space optimizes storage but may reduce matching likelihood if latency difference is too big.

You'll always need to balance these factors—there's no one-size-fits-all formula. Each solution depends on business requirements and usual latency differences between joined datasets.

**Late data**

Late data is another reason for missed joins. Stream processing has inherently lower latency semantics and weaker tolerance for late data integration. For example, the users stream could encounter temporary connectivity issues, leading to delayed delivery. The GC watermark will move on and invalidate buffered state, causing late events to be ignored.

> **Warning**
>
> Neither enrichment pattern gives 100% guarantee of join results without extra effort due to late data arrival. To overcome this limitation, track and integrate late data as explained in Chapter 3.

#### Examples

**Time-Based Condition for Apache Spark Structured Streaming**

Let's see this pattern in action with a streaming job. Here's a join condition combining visits with displayed ads:

<PythonRunner
  title="Time-Based Join in Spark Structured Streaming"
  code={`from pyspark.sql import functions as F

# Define watermarks for both streams
visits_from_kafka = (visits_data_stream
    .withWatermark('event_time', '10 minutes'))

ads_from_kafka = (ads_data_stream
    .withWatermark('display_time', '10 minutes'))

# Perform time-bounded join
visits_with_ads = visits_from_kafka.join(
    ads_from_kafka,
    F.expr('''
        page = visit_page AND
        display_time BETWEEN event_time AND event_time + INTERVAL 2 minutes
    '''),
    'left_outer'
)

# Write results
(visits_with_ads.writeStream
    .format('delta')
    .option('checkpointLocation', '/checkpoints')
    .start('/output/visits_with_ads'))`}
/>

The join condition has business and technical meanings. It makes explicit the business rule that an ad can be displayed at most two minutes after a user visits a page. From a technical standpoint, it also means there's room for late data—the `withWatermark` expression allows late records up to 10 minutes on both sides.

**Temporal Table Join in Apache Flink**

Apache Flink also supports this join type and offers a more managed alternative called temporal table joins. This code is in Java due to lack of Python API support:

<CodeRunner
  language="java"
  title="Temporal Table Join in Apache Flink"
  code={`// Create visits table with watermark
tableEnv.createTemporaryTable("visits_tmp_table",
    TableDescriptor.forConnector("kafka")
        .schema(Schema.newBuilder()
            .fromColumns(SchemaBuilders.forVisits())
            .watermark("event_time", "event_time - INTERVAL '5' MINUTES")
            .build())
        .option("topic", "visits")
        .build());

// Create ads table with watermark
tableEnv.createTemporaryTable("ads_tmp_table",
    TableDescriptor.forConnector("kafka")
        .schema(Schema.newBuilder()
            .fromColumns(SchemaBuilders.forAds())
            .watermark("update_time", "update_time - INTERVAL '5' MINUTE")
            .build())
        .option("topic", "ads")
        .build());

// Create temporal table function
TemporalTableFunction adsLookupFunction = adsTable
    .createTemporalTableFunction($("update_time"), $("ad_page"));

tableEnv.createTemporarySystemFunction("adsLookupFunction", adsLookupFunction);

// Perform temporal join
Table joinResult = visitsTable
    .joinLateral(call("adsLookupFunction", $("event_time")),
        $("ad_page").isEqual($("page")))
    .select($("*"));`}
/>

The code starts with table declarations. Besides schema and topic configuration, it defines allowed watermarks for each topic. Next, it initializes a `TemporalTableFunction` used in the `joinLateral` command. This function performs the important role of getting the most recent ad for each page—specifically, an ad whose `update_time <= event_time`.

---

## 3. Data Decoration

**In plain English:** Decoration is like adding notes and highlights to a document—you enhance the original content with computed insights while keeping the source intact for reference.

**In technical terms:** Data decoration patterns augment records with computed attributes, derived fields, or execution metadata while maintaining separation between original and transformed values for debugging and processing transparency.

**Why it matters:** Raw or unstructured data is rarely in final form. Without additional preparation, it's hard to understand and use. Decoration patterns add computed context that makes data actionable while preserving original values.

Once a dataset has gained increased value through enrichment, the next question is: is that enough? Data is crucial in modern organizations, but in the enrichment scenario where data is still raw or unstructured, it's rarely final. Data decoration patterns help bridge this gap.

### 3.1. Pattern: Wrapper

**In plain English:** Wrapper is like putting a letter in an envelope with metadata on the outside—you keep the original message intact while adding contextual information about sender, timestamp, and handling instructions.

**In technical terms:** The Wrapper pattern adds an extra abstraction layer at the record level, wrapping original values with a high-level envelope that includes both raw attributes and computed fields from the input data or execution context.

**Why it matters:** When downstream consumers need both original data for debugging and computed values for processing, wrapping maintains this dual nature without losing either perspective.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that adds an extra abstraction layer at the record level, wrapping original values with a high-level envelope that includes computed attributes. |
| **When to use** | ✓ Need to separate computed values from original ones ✓ Must keep original structure for debugging ✓ Want to simplify downstream processing logic |
| **Core problem** | Domain split and size impact—pattern divides attributes for a given domain into raw and computed structures, making data retrieval more complicated and impacting overall size and network traffic. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Flat raw + nested computed (or vice versa) | Denormalized approach for faster reading |
| All columns flat at same level | Need logical isolation without changing original structure |
| Separate tables joined by unique key | Cannot change original structure or need complete separation |

> 📁 **Full code**: [chapter-05/02-data-decoration](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/02-data-decoration)

---

#### Problem

Your streaming layer processes visit data from different data providers, resulting in different output schemas.

You need to write a job that extracts fields and puts them in a single place for easy downstream processing. The requirement: clearly separate computed values from original ones to simplify processing logic but keep the original structure for debugging needs.

#### Solution

The requirement to keep the original record untouched reduces transformation scope. You can't simply parse the row and generate a new structure—you'll lose initial values. To preserve them, use the Wrapper pattern.

<DiagramContainer title="Wrapper Pattern Implementations">
  <CardGrid
    columns={2}
    cards={[
      {
        title: "Implementation 1",
        icon: "📦",
        color: colors.blue,
        items: ["Flat raw structure", "Nested computed attributes"]
      },
      {
        title: "Implementation 2",
        icon: "📦",
        color: colors.purple,
        items: ["Flat computed structure", "Nested raw attributes"]
      },
      {
        title: "Implementation 3",
        icon: "📦",
        color: colors.green,
        items: ["All columns flat", "Same-level structure"]
      },
      {
        title: "Implementation 4",
        icon: "📦",
        color: colors.orange,
        items: ["Separate tables", "Join by unique key"]
      }
    ]}
  />
</DiagramContainer>

The idea: add an extra abstraction at the record's level. The abstraction wraps original values with a high-level envelope. In addition to initial attributes, the envelope references computed attributes that may come from:
- The input data itself
- The execution context (processing time, job version)

For example, an input visit event could transform into an event composed of `raw` and `computed` sections.

**Structured Format Implementations**

For structured formats like tables, you can implement wrapping as:
1. **Denormalized:** Original row flat, computed columns nested (or vice versa)—faster at reading
2. **Normalized:** All columns flat at the same level—better for logical isolation
3. **Separate tables:** Two tables joined by unique key—necessary when you can't change original structure

All approaches share the need for schema management (covered in Chapter 9).

> **Insight**
>
> **Wrapper in a Table?** Even though the wrapper envelope isn't directly visible in structured formats, it's still there. The envelope is a row of a table. There's no need to break from normal columnar format and put fields from multiple columns into one nested column.

#### Consequences

This logical and physical separation may have serious consequences, mostly related to storage footprint:

**Domain split**

This is the logical implication—the pattern divides attributes for a given domain. For example, a user's fields exist in two different high-level structures: `raw` and `computed`.

Advantages: Clear distinction between transformed and nontransformed values
Drawbacks: More complicated data retrieval—consumers must know data is in two locations

**Trade-off:** Consider wrapped data to belong to first storage layers (like the Silver layer from our use case), not final data exposed to users where this separation may be confusing.

**Size**

Decorated values form an intrinsic part of the processed record, impacting overall size and network traffic. This differs from the Metadata Decorator pattern (next section).

Mitigation: If your data storage format supports data source projection, select only columns you're interested in and physically access only them. This practice is common for columnar data storage solutions like data warehouses (AWS Redshift, GCP BigQuery).

#### Examples

The Wrapper supports both business and technical attributes. The second category includes metadata values from execution context—job version, execution time—that help with debugging production issues later.

**Wrapping Metadata with PySpark**

Here's how to integrate execution context metadata into rows:

<PythonRunner
  title="Wrapping Metadata with PySpark"
  code={`from pyspark.sql import functions as F

job_version = "v2.5.1"
batch_number = 42

# Add processing context as struct
visits_w_processing_context = visits.withColumn(
    'processing_context',
    F.struct(
        F.lit(job_version).alias('job_version'),
        F.lit(batch_number).alias('batch_version')
    )
)

# Create final wrapped structure
visits_to_save = visits_w_processing_context.withColumn(
    'value',
    F.to_json(
        F.struct(
            F.col('value').cast('string').alias('raw_data'),
            F.col('processing_context')
        )
    )
)

# Result: JSON document with raw_data and processing_context`}
/>

The code defines metadata as a new column of the input dataset. Next, it includes these extra attributes with a new structure composed of the initial value (`raw_data`) and technical context (`processing_context`). The whole is then transformed into a JSON document and written to the output database.

**Wrapping with SQL**

You can also perform wrapping in SQL. Here's a query enriching input rows with an additional structure called `decorated`:

<CodeRunner
  language="sql"
  title="Wrapping with Extra Struct in SQL"
  code={`SELECT
  *,
  NAMED_STRUCT(
    'is_connected',
    CASE WHEN context.user.connected_since IS NULL
      THEN false ELSE true END,
    'page_referral_key',
    CONCAT_WS('-', page, context.referral)
  ) AS decorated
FROM input_visits`}
/>

The `NAMED_STRUCT` function provides a convenient way to alter struct key names with key-value pairs: `key1, value1, key2, value2, ..., keyn, valuen`.

**Promoting Computed Values**

Alternatively, consider decorated data to be first-class table columns and all raw data to be additional context:

<CodeRunner
  language="sql"
  title="Wrapping with Raw Value Struct in SQL"
  code={`SELECT
  CASE WHEN context.user.connected_since IS NULL
    THEN false ELSE true END AS is_connected,
  CONCAT_WS('-', page, context.referral) AS page_referral_key,
  STRUCT(visit_id, event_time, user_id, page, context) AS raw
FROM input_visits`}
/>

This promotes all computed values as table columns and relegates raw values to a column of struct type.

Finally, you can also have a table with all computed columns at the same level as input ones. Be aware that in this context, end users may not distinguish raw from computed values if names don't clearly differentiate them.

---

### 3.2. Pattern: Metadata Decorator

**In plain English:** Metadata Decorator is like restaurant kitchen tickets—they contain preparation notes and timing information visible to kitchen staff but never shown to dining customers.

**In technical terms:** The Metadata Decorator pattern stores technical context (job version, processing time, execution metadata) in the metadata layer of your data store rather than in the record payload, keeping it hidden from end users while available for technical debugging.

**Why it matters:** Technical context is valuable for maintenance but irrelevant to business users. Hiding it in metadata prevents confusion while maintaining debugging capabilities.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that stores technical context in the metadata layer of your data store rather than in the record payload, keeping it hidden from end users. |
| **When to use** | ✓ Need to track job version, processing time, or execution metadata ✓ Technical context should not be exposed to business users ✓ Want to maintain debugging capabilities without confusing consumers |
| **Core problem** | Implementation challenges—data store support for metadata handling is the biggest limitation; streaming brokers may lack native metadata support, and table datasets often require extra columns or tables. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Native metadata (Kafka headers, S3 tags) | Data store supports metadata out of the box |
| Hidden columns with views or permissions | Relational/NoSQL databases without native metadata support |
| Separate technical table (restricted access) | Need normalized metadata without duplication per row |

> 📁 **Full code**: [chapter-05/02-data-decoration](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/02-data-decoration)

---

#### Problem

Your streaming jobs evolve quite often—you release a new version almost once a week.

Although your deployment process is smooth, you lack visibility into the impact of released versions on generated data. To simplify maintenance, you need to add technical context to each generated record, such as job version. However, you don't want to include this information in records sent to end users.

#### Solution

Including technical context in records with the Wrapper pattern isn't an option—this information may not be relevant to consumers who aren't interested in internal data processing details. Instead, leverage the metadata layer of your data store to apply the Metadata Decorator pattern.

<DiagramContainer title="Metadata Decorator Implementations">
  <StackDiagram
    title="Storage Approaches"
    layers={[
      {
        label: "Native Metadata (Kafka Headers, S3 Tags)",
        color: colors.green,
        items: ["Built-in support", "Easy implementation"]
      },
      {
        label: "Hidden Columns (Views, Permissions)",
        color: colors.blue,
        items: ["Dedicated column", "Access control"]
      },
      {
        label: "Separate Table (Technical Schema)",
        color: colors.purple,
        items: ["Normalized approach", "Join on demand"]
      }
    ]}
  />
</DiagramContainer>

Implementation depends on your data store's metadata handling capabilities:

**Native Metadata Support**

If your data store supports metadata out of the box, you can associate each written record with dedicated metadata attributes. Apache Kafka supports optional header key-value pairs for each record besides key and value attributes.

For object stores, if metadata decoration applies to all rows in a file, define metadata attributes as tags associated with the file.

**Simulated Metadata Support**

If tags are unavailable, other data stores may not support metadata decoration natively—like relational or NoSQL databases. You can simulate decoration by including metadata within the data part without publicly exposing it to end users.

For data warehouse tables tracking metadata individually for each record:
1. Write metadata to a dedicated column
2. Expose the table from a view without technical information, or
3. Use permissions to block reading that column by nontechnical users (see "Pattern: Fine-Grained Accessor for Tables")

Example schema:

| event_id | event_time | ... | processing_context |
|----------|------------|-----|-------------------|
| 1 | 2023-06-10T10:00:59Z | | `{"job_version": "v1.0.3", "processing_time":"2023-06-10T10:02:00Z"}` |

**Separate Table Approach**

Store processing context in a dedicated table that joins with the dataset:

**Data Table:**

| event_id | event_time | ... | processing_context_id |
|----------|------------|-----|-----------------------|
| 1 | 2023-06-10T10:00:59Z | | 1 |

**Technical Table (restricted access):**

| processing_context_id | job_version | ... | processing_time |
|----------------------|-------------|-----|-----------------|
| 1 | v1.0.3 | | 2023-06-10T10:02:00Z |

This implementation normalizes metadata as a separate table, avoiding duplication for each row. Again, users shouldn't have access to the technical table or the `processing_context_id` field to avoid confusion.

> **Insight**
>
> **Wrapper and Metadata Semantics:** This metadata decoration is similar to the Wrapper pattern. The only difference is semantics. Metadata is not supposed to be exposed publicly to business users because by definition, it's a description of the data. That's not the case with the Wrapper, which is intended to decorate business attributes in addition to technical ones.

#### Consequences

Data store support for metadata handling will probably be your biggest limitation, but it's not the only one:

**Implementation**

Even streaming brokers from the problem statement may lack native metadata support, making implementation impossible. For example, Amazon Kinesis Data Streams doesn't support headers.

Implementation can also be challenging for table datasets where you'll often need to define an extra column or table to handle metadata information. Although this works, it requires more effort than for data stores that natively support metadata decoration.

**Data**

Even though there's no technical limitation on what type of information you can put into the metadata layer, you should avoid writing business-related attributes there—like shipment addresses or invoice amounts. Otherwise, they remain hidden to consumers, most of whom will never think about querying the metadata part.

> **Warning**
>
> By definition, metadata is data about data. External dataset users will primarily be interested in the data from the second part of that sentence. Never hide business attributes in metadata layers.

#### Examples

**Adding Metadata Headers for Apache Kafka in PySpark**

For each new concept, it's better to start with an easy example. Here's how to add metadata to an Apache Kafka record written from Apache Spark Structured Streaming:

<PythonRunner
  title="Adding Metadata Header for Kafka in PySpark"
  code={`from pyspark.sql import functions as F

job_version = "v2.5.1"
batch_number = 42

# Create headers array with metadata
visits_with_metadata = visits_to_save.withColumn(
    'headers',
    F.array(
        F.struct(
            F.lit('job_version').alias('key'),
            F.lit(job_version).alias('value')
        ),
        F.struct(
            F.lit('batch_version').alias('key'),
            F.lit(str(batch_number).encode('UTF-8')).alias('value')
        )
    )
)

# Write to Kafka with headers
(visits_with_metadata.write
    .format('kafka')
    .option('kafka.bootstrap.servers', 'localhost:9094')
    .option('includeHeaders', True)
    .option('topic', 'visits-decorated')
    .save())`}
/>

Two important parts: First, metadata is an array of key-value pairs. Second, the `includeHeaders` option commands Apache Spark to include the `headers` column in the generated record out of the box.

**External Metadata Table**

Another implementation uses an external metadata table whose schema is:

<CodeRunner
  language="sql"
  title="Metadata Table Initialization"
  code={`CREATE TABLE dedp.visits_context (
    execution_date_time TIMESTAMPTZ NOT NULL,
    loading_time TIMESTAMPTZ NOT NULL,
    code_version VARCHAR(15) NOT NULL,
    loading_attempt SMALLINT NOT NULL,
    PRIMARY KEY (execution_date_time)
);`}
/>

The context table is later referenced as part of the job loading input data to the user-exposed table. The loading script first inserts new execution context and later adds the primary key of `visits_context` to the `visits` weekly table:

<CodeRunner
  language="sql"
  title="Inserting New Visits with Metadata Table"
  code={`{% set weekly_table = get_weekly_table_name(execution_date) %}

-- Insert execution context
INSERT INTO dedp.visits_context
  (execution_date_time, loading_time, code_version, loading_attempt)
VALUES
  ('{{ execution_date }}',
   '{{ dag_run.start_date }}',
   '{{ params.code_version }}',
   {{ task_instance.try_number }});

-- Insert visits with context reference
INSERT INTO {{ weekly_table }}
  (SELECT
    tmp_devices.*,
    '{{ execution_date }}' AS visits_context_execution_date_time
   FROM tmp_devices);`}
/>

As a result, you can combine visits with metadata by joining on the execution date time.

---

## 4. Data Aggregation

**In plain English:** Aggregation is like creating a photo album from thousands of individual pictures—you reduce overwhelming detail into comprehensible summaries that tell a clearer story.

**In technical terms:** Data aggregation patterns combine multiple records into summary statistics, analytics cubes, or reduced representations using distributed or local processing to transform high-volume datasets into actionable insights.

**Why it matters:** Big data volumes are overwhelming without summarization. Aggregation transforms millions of events into dashboards, KPIs, and OLAP cubes that stakeholders can actually use for decision-making.

So far, you've been "adding" information. But can you imagine that removing it is also a way to generate data value? If not, the two patterns in this section should prove you wrong.

### 4.1. Pattern: Distributed Aggregator

**In plain English:** Distributed Aggregator is like organizing a massive census—no single person can count everyone, so you divide the work across many counters who each handle a region, then combine their results.

**In technical terms:** The Distributed Aggregator pattern leverages distributed data processing frameworks to combine multiple physically isolated but logically similar items across a cluster of machines using group-by and reduce operations with network shuffling.

**Why it matters:** When datasets exceed single-machine capacity, distributed aggregation enables processing at scale by dividing work across multiple servers that collectively handle volumes no individual node could manage.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that leverages distributed data processing frameworks to combine multiple physically isolated but logically similar items across a cluster using group-by and reduce operations. |
| **When to use** | ✓ Datasets exceed single-machine capacity ✓ Related records split across multiple physical places ✓ Need to build OLAP cubes or analytics aggregates |
| **Core problem** | Additional network exchange and data skew—pattern involves shuffle step to exchange records across the network (latency troublemaker), and unbalanced datasets with skewed keys increase processing cost on single nodes. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Standard group-by with shuffle | Related records across multiple machines need combining |
| Partial aggregation before shuffle | Aggregation supports partial generation (e.g., count, sum) |
| Salting for skewed keys | At least one key has way more occurrences than others |

> 📁 **Full code**: [chapter-05/03-data-combination](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/03-data-combination)

---

#### Problem

You've written a job that cleans raw visit events from the Bronze layer and writes them to the Silver layer. From there, many consumers implement various final business use cases.

One use case requires building an online analytical processing (OLAP) cube, reducing all visits to an aggregated format well-suited for dashboarding scenarios. The result should include basic statistics (count, average duration) across multiple axes (user geography, devices).

The dataset is stored in daily event time partitions, and analytics cubes should represent daily and weekly views.

#### Solution

For datasets that fit into a single machine or container, you don't need any specific tool for aggregation. The native `group by` function of your programming language, followed by reduce logic, should be enough.

However, in the big data era, when related records can be split across multiple physical places, this requirement doesn't always hold. That's where the Distributed Aggregator pattern helps.

<DiagramContainer title="Distributed Aggregator Architecture">
  <Column gap="lg">
    <Row gap="md" align="center">
      <Box color={colors.blue} icon="📊">Data Source 1</Box>
      <Box color={colors.blue} icon="📊">Data Source 2</Box>
      <Box color={colors.blue} icon="📊">Data Source 3</Box>
    </Row>
    <Row gap="md" align="center">
      <Arrow direction="down" label="load" />
    </Row>
    <Row gap="md" align="center">
      <Box color={colors.purple} icon="⚙️">Node 1</Box>
      <Box color={colors.purple} icon="⚙️">Node 2</Box>
      <Box color={colors.purple} icon="⚙️">Node 3</Box>
    </Row>
    <Row gap="md" align="center">
      <Arrow direction="down" label="shuffle" />
    </Row>
    <Row gap="md" align="center">
      <Box color={colors.orange} icon="🔄">Reduce 1</Box>
      <Box color={colors.orange} icon="🔄">Reduce 2</Box>
    </Row>
    <Row gap="md" align="center">
      <Arrow direction="down" />
    </Row>
    <Box color={colors.green} icon="✅">Aggregated Results</Box>
  </Column>
</DiagramContainer>

The pattern leverages multiple machines that together form a single execution unit called a cluster. These servers individually don't have enough capacity to process the whole input dataset, but together, they divide the work and can handle this scenario.

**Implementation**

Despite this hardware difference, code-based implementation may remain the same as for small, local datasets. You can still use a grouping function to bring related rows together and later apply a reduce function on top of them. The first step is optional—you can also combine the whole dataset as is (for example, to get a total count of rows or a global average).

**The Devil is in the Details**

Although the API might look the same, under the hood, execution of the Distributed Aggregator involves a step to exchange records that were initially loaded into different machines, across the network. As a result, the reduce function can operate on all necessary collocated rows.

This action is called a **shuffle**. Often, it is one of the first latency troublemakers because of network traffic cost.

**Optimization: Partial Aggregation**

Not all record exchanges are raw. Any aggregation that supports partial generation can be optimized by performing a partial aggregation locally, before the shuffle. As a result, exchanged records will be smaller and the whole operation should be faster.

Example: For the `count` operation, instead of shuffling all raw records and counting them on the final reduce nodes, the compute layer can perform a partial count on each initial node for all keys present locally and shuffle only the numbers to sum in the end.

> **Insight**
>
> **MapReduce:** The Distributed Aggregator pattern is a typical example of the MapReduce programming model, which greatly contributed to simplifying distributed data processing back in 2004. Over the years, implementations evolved from disk-based Hadoop MapReduce to memory-first Apache Spark.

#### Consequences

Even though frameworks fully implement the pattern with high-level API and low-level cluster orchestration, there are some gotchas related to the data itself:

**Additional network exchange**

The pattern involves two network exchanges:
1. **Input loading:** Brings input data to each node (difficult to avoid as storage and compute colocation is not common nowadays)
2. **Shuffle:** Gathers related data on the same server (required step but can be avoided under specific conditions—see next section on Local Aggregator pattern)

This shuffle can be one of the possible latency issues to look at when problems arise.

**Data skew**

Data skew describes unbalanced datasets where at least one key has way more occurrences than others. In that case, the cost of moving it across the network and processing it in a single node will be highest.

Mitigation techniques:
- **Salting:** Add an extra value (salt) to the grouping key and perform first grouping on the salted column. Then, if you need results for the original grouping key, aggregate the salted column's aggregation again
- **Adaptive Query Execution:** Apache Spark has native data skew mitigation with Adaptive Query Execution

Example salting in PySpark:

<PythonRunner
  title="Salting Example in PySpark for Skewed Column"
  code={`from pyspark.sql.functions import rand

# Add salt to distribute skewed keys
dataset_with_salt = dataset.withColumn('salt', (rand() * 3).cast("int"))

# First aggregation with salt
first_agg = (dataset_with_salt
    .groupBy('group_key', 'salt')
    .agg(F.sum('amount').alias('partial_sum')))

# Second aggregation without salt (final result)
final_agg = (first_agg
    .groupBy('group_key')
    .agg(F.sum('partial_sum').alias('total_sum')))`}
/>

**Scaling**

In addition to network traffic impact, shuffle has another implication: scaling. If a node has completed all planned reduce operations, it may still be in use by the hardware layer for fault tolerance reasons. If the whole reduce computation fails and gets restarted, this data won't need to be reshuffled again.

But when there is no failure, the node will still be there but will not be reclaimed as long as the processing is running. If you want to avoid keeping it all that time, you can opt for a component called **shuffle service**.

Shuffle service is an additional compute component responsible for storing and serving only shuffle data. If one node is not used anymore, the compute layer can free it at any time, even when the job is still running.

Implementations:
- Apache Spark's External Shuffle Service
- GCP Dataflow's Shuffle

#### Examples

**Aggregation of Physically Isolated Data Stores**

The best way to understand the Distributed Aggregator with an easily reproducible local demo is to use two different data stores. We'll use PostgreSQL and a local file system with JSON files:

<PythonRunner
  title="Aggregation of Two Physically Isolated Data Stores in PySpark"
  code={`from pyspark.sql import SparkSession

spark_session = SparkSession.builder.appName("DistributedAggregator").getOrCreate()
base_dir = "/data"

# Read from JSON files
visits = spark_session.read.json(f'{base_dir}/input-visits')

# Read from PostgreSQL
devices = spark_session.read.jdbc(
    url='jdbc:postgresql:dedp',
    table='dedp.devices',
    properties={
        'user': 'dedp_test',
        'password': 'dedp_test',
        'driver': 'org.postgresql.Driver'
    }
)

# Join datasets (triggers shuffle)
visits_with_devices = visits.join(
    devices,
    [devices.type == visits.context.technical.dev_type,
     devices.version == visits.context.technical.dev_version],
    'inner'
)`}
/>

Although data stores are physically isolated, Apache Spark can combine them.

**Checking for Shuffle**

Apache Spark provides a convenient way to check whether the operation contains shuffle. Call the `explain()` method on your DataFrame and look for the `Exchange hashpartitioning` node:

<PythonRunner
  title="Execution Plan for Devices-to-Users Join"
  code={`# Call explain to see physical plan
visits_with_devices.explain()

# Output shows shuffle with Exchange hashpartitioning:
# == Physical Plan ==
# AdaptiveSparkPlan isFinalPlan=false
# +- SortMergeJoin [ctx.technical.dev_type, ctx.technical.dev_version]
#  :- Sort [ctx.technical.dev_type ASC NULLS FIRST, ...]
#  : +- Exchange hashpartitioning(ctx.technical.dev_type, ...)
#  :   +- Filter (...)
#  :     +- FileScan json [...]
#  +- Sort [type ASC NULLS FIRST, version ASC NULLS FIRST]
#    +- Exchange hashpartitioning(type, version, 200)
#       +- Scan JDBCRelation(...)`}
/>

The execution plan shows local operations like filtering before preparing data to be exchanged across the network.

**External Tables in Data Warehouses**

In addition to distributed data processing frameworks, the pattern works for databases that can read datasets from different storage locations. For example, in GCP BigQuery (a serverless data warehouse), you can combine a table with files stored on Google Cloud Storage (GCS).

To enable this combination, declare the GCS objects to be an external table and later reference them as any regular BigQuery objects in queries. External tables are also supported in:
- AWS Redshift
- Azure Synapse Analytics
- Snowflake

---

### 4.2. Pattern: Local Aggregator

**In plain English:** Local Aggregator is like having pre-sorted mail delivery routes—since all addresses on each route are already organized together, the postal worker doesn't need to go back to the sorting facility between stops.

**In technical terms:** The Local Aggregator pattern performs aggregations without network shuffle by leveraging pre-partitioned data sources where all records for a given grouping key are already collocated in the same physical partition.

**Why it matters:** When data is correctly partitioned and static, local aggregation eliminates costly shuffle operations, significantly improving performance and reducing network overhead.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that performs aggregations without network shuffle by leveraging pre-partitioned data sources where all records for a given grouping key are collocated. |
| **When to use** | ✓ Data is correctly partitioned in the input ✓ Data source partitioning is static and immutable ✓ All related records for a grouping key are in same partition |
| **Core problem** | Scaling challenges—pattern depends on static nature of data source and consistent partitioning; changing partitions requires costly data storage reorganization and stop-the-world event for streaming applications. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Kafka Streams groupByKey() | Processing data from Apache Kafka with key-based partitioning |
| Spark per-partition operations (mapPartitions) | Pre-partitioned datasets with same grouping key |
| Distribution keys (Redshift KEY/ALL) | Data warehouse with collocated storage distribution |

> 📁 **Full code**: [chapter-05/03-data-combination](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/03-data-combination)

---

#### Problem

You have a streaming job that generates windows for incoming visits stored in a partitioned streaming broker. The data volume is static, and you don't expect any sudden variations or changes in underlying partitioning. As a result, the partition number will never change.

You're looking for a way to optimize the job and remove the grouping shuffle step that's added automatically by your data processing framework.

#### Solution

A costly shuffle, static data source partitioning, and related attributes stored together are three factors in favor of the alternative to the Distributed Aggregator: the Local Aggregator pattern.

<DiagramContainer title="Local Aggregator vs Distributed Aggregator">
  <ComparisonTable
    beforeTitle="Distributed"
    afterTitle="Local"
    beforeColor={colors.red}
    afterColor={colors.green}
    items={[
      { label: "Network shuffle", before: "Required", after: "Not required" },
      { label: "Scalability", before: "Dynamic", after: "Static partitions" },
      { label: "Performance", before: "Slower", after: "Faster" },
      { label: "Task isolation", before: "Coordinated", after: "Fully isolated" }
    ]}
  />
</DiagramContainer>

Although on the surface the pattern still performs aggregations, it does so locally with the single network exchange of reading the input data. This solution works thanks to:
- Fixed partitioning schema
- Correct input data distribution

All records relevant for a given grouping key are already present in the same input partition, so there's no need to load them from other places.

**Additional Advantages**

Besides lack of shuffle, this implementation brings another advantage: tasks can be fully isolated. They won't need to wait for data on other tasks and can move forward. This is especially useful for streaming applications where some slower processing units may delay the whole execution.

**Implementation Focus**

The implementation effort should focus on the **producer side**. It must guarantee to write a record with a particular grouping key to the same physical partition. This can be achieved with:
- Static per-record partitioning key
- Immutable number of partitions

**Consumer Side**

Some tools provide facility methods to adapt the pre-partitioned dataset to its shuffle format:
- **Kafka Streams:** `groupByKey` method
- **Apache Spark:** Doesn't provide explicit hints or methods, but avoids shuffle for:
  - Per-partition operations (`mapPartitions`, `foreachPartition`)
  - Datasets saved in buckets with same key and same number of buckets

> **Insight**
>
> **About Buckets:** Bucketing (aka clustering) is a way of partitioning the partitions. You'll learn more about it in the Bucket pattern in Chapter 8.

**Small Datasets**

For nonpartitioned or partitioned but small datasets, you don't need to worry about static numbers of partitions. You can load the whole dataset into your processing node and leverage shared memory to perform any aggregations.

#### Consequences

The pattern requires some immutability, which may not always be possible, for the storage and grouping keys:

**Scaling**

Scaling is the most visible issue. The pattern depends on:
- Static nature of the data source
- Consistent partitioning (guarantee that a given key is always available from only one processing partition)

If you can't guarantee one of these conditions, the pattern won't work correctly because it'll create one or multiple groups for a given key whenever you change storage partitions.

**Scaling Strategy**

If you need to scale and adapt the organization, you could do it with a dedicated data storage reorganization task, which would regenerate partition assignments for all records. This operation may be costly as it requires processing the whole dataset.

It's even trickier for streaming applications since it would involve a stop-the-world event to enable processing all remaining data on old partitions before data producers can write records to newly organized partitions.

> **Warning**
>
> Local Aggregator avoids extra shuffle but makes the important scaling part a lot more challenging. This is the trade-off for performance gains.

**Grouping keys**

For partitioned data sources with static numbers of partitions, the pattern also expects one grouping key logic for all consumers. This may not be easy because it would involve writing the same record in multiple places, each time with a different grouping key.

Example: If your application reading user profile changes groups them by change type while other consumers perform user ID-based aggregation, you'll need to opt for the Distributed Aggregator pattern for one of those customers.

#### Examples

**Local Aggregation in Kafka Streams**

Let's start with Kafka Streams, a Java-written data processing layer that processes data from Apache Kafka. The library has a `groupByKey` method that implements the Local Aggregator pattern:

<CodeRunner
  language="java"
  title="Local Aggregation in Kafka Streams"
  code={`KStream<String, String> visitsSource = streamsBuilder.stream("visits");

// Group by key without shuffle (uses record key)
KGroupedStream<String, String> groupedVisits = visitsSource.groupByKey();

// Aggregate locally
KStream<String, AggregatedVisits> aggregatedVisits = groupedVisits
    .aggregate(
        AggregatedVisits::new,
        new AggregatedVisitsAggregator(),
        Materialized.with(Serdes.String(), new JsonSerializer<>())
    )
    .toStream();

// Write results
aggregatedVisits.to(
    "visits-aggregated",
    Produced.with(new Serdes.StringSerde(), new JsonSerializer<>())
);`}
/>

The method uses the key attribute associated with each incoming record to combine all records sharing the same key without network exchange. There's no mention of any key because it uses the record's built-in key.

**Implicit Local Aggregation in Apache Spark**

If this API capability is not explicitly provided by your library, there may be an implicit way to use it. Here's Apache Spark code that aggregates visit events without network exchange:

<PythonRunner
  title="Local Aggregator for Visits in PySpark"
  code={`from pyspark.sql.functions import col

# Sort within each partition (no shuffle)
sorted_visits = (visits_to_save
    .sortWithinPartitions(['visit_id', 'event_time']))

def write_records_from_spark_partition_to_kafka_topic(visits):
    kafka_writer = KafkaWriter(
        bootstrap_server='localhost:9092',
        output_topic='visits-aggregated'
    )
    for visit in visits:
        kafka_writer.process(visit)
    kafka_writer.close()

# Process each partition independently
sorted_visits.foreachPartition(
    write_records_from_spark_partition_to_kafka_topic
)`}
/>

The job sorts visit events in each partition by `visit_id` and `event_time` fields. After ordering records (still separately for each partition), Apache Spark calls the `KafkaWriter`:

<PythonRunner
  title="Local Aggregator: Partition-Based Writer"
  code={`class KafkaWriter:
    def __init__(self, bootstrap_server, output_topic):
        self.bootstrap_server = bootstrap_server
        self.output_topic = output_topic
        self.in_flight_visit = {'visit_id': None}

    def process(self, row):
        # Detect visit change
        if row.visit_id != self.in_flight_visit['visit_id']:
            self.send_visit_to_kafka(self.in_flight_visit)
            self.in_flight_visit = {
                'visit_id': row.visit_id,
                'pages': [],
                'duration': 0
            }

        # Accumulate pages in session
        self.in_flight_visit['pages'].append(row.page)
        # ... additional accumulation logic

    def send_visit_to_kafka(self, visit):
        # Send aggregated visit to Kafka
        pass`}
/>

This class uses sorted rows to generate an aggregate of pages visited in a session. Whenever the `visit_id` is different from the currently buffered visit, the writer sends the aggregation result to the output Kafka topic.

**Storage Distribution in AWS Redshift**

Cloud services provide local aggregation capability. AWS Redshift distribution types enable this:

<CodeRunner
  language="sql"
  title="Storage Distribution in AWS Redshift"
  code={`-- Visits table with KEY distribution
CREATE TABLE visits (
  visit_id INT,
  user_id INT,
  event_time TIMESTAMP,
  page VARCHAR(255)
)
DISTSTYLE KEY
DISTKEY(visit_id);

-- Users table with ALL distribution
CREATE TABLE users (
  user_id INT,
  email VARCHAR(255),
  registered_at TIMESTAMP
)
DISTSTYLE ALL;`}
/>

The `KEY` distribution groups all rows sharing the same `DISTKEY` on the same storage node. Any combination involving the `DISTKEY` column can be performed locally.

The `ALL` distribution copies the users table to all nodes in the cluster. As a result, any join operation with the users table will be performed locally, without shuffle.

---

## 5. Sessionization

**In plain English:** Sessionization is like watching a TV series—you group related episodes into seasons, with each season having a clear beginning, middle, and end, making the overall story easier to understand.

**In technical terms:** Sessionization patterns combine events related to the same activity into logical sessions defined by initialization, accumulation, and finalization states, supporting both batch and streaming processing modes.

**Why it matters:** Sessions transform disconnected events into meaningful user journeys, workout sessions, or activity periods that provide context for analytics, personalization, and behavioral understanding.

Sessions are special kinds of aggregators since they combine events related to the same activity. You generate them in your daily life whenever you watch streaming videos, work out, or even cook. In each of those activities, you create a session composed of:
- Starting point
- Session events
- Ending point

In a data engineering context, depending on the nature of your data (at rest or in motion), you can choose from two available sessionization patterns.

### 5.1. Pattern: Incremental Sessionizer

**In plain English:** Incremental Sessionizer is like building a puzzle over multiple days—you save your progress after each session, pick up where you left off, and eventually complete the picture by combining work from all sessions.

**In technical terms:** The Incremental Sessionizer pattern generates sessions in batch pipelines by combining new input data with pending sessions from previous executions across three storage spaces: input dataset, completed sessions, and pending sessions.

**Why it matters:** When data arrives in time-based partitions and sessions can span multiple partitions, incremental sessionization enables batch processing to correctly handle cross-partition session boundaries without reprocessing all historical data.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that generates sessions in batch pipelines by combining new input data with pending sessions from previous executions across three storage spaces. |
| **When to use** | ✓ Data arrives in time-based partitions (hourly, daily) ✓ Sessions can span multiple partitions ✓ Batch processing is acceptable for session generation |
| **Core problem** | Inactivity period and forward dependency—longer inactivity periods allow more late data but require more compute/storage resources; sessions are forward dependent, so backfilling one partition requires replaying all subsequent partitions. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Three storage spaces (input/completed/pending) | Standard batch sessionization with orchestrator |
| Partial session emission with is_final flag | Users can accept partial session views for earlier insights |
| WINDOW function or GROUP BY with custom logic | Defining initialization, accumulation, and finalization states |

> 📁 **Full code**: [chapter-05/04-sessionization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/04-sessionization)

---

#### Problem

The data ingestion team stores visit events in hourly partitioned locations. You want to aggregate them into sessions that start with the first visit and end if there are no new visits from the given user within two hours.

The typical duration of a visit session is between several minutes and three hours. As a result, one visit can spread across at most three different partitions. Data analysts are struggling to get sessions right because each time, they need to process many consecutive partitions for a given user.

You know about the Incremental Loader design pattern and have an idea about how to leverage it for the sessionization use case.

#### Solution

Since records for one session may be present in multiple consecutive partitions, the problem belongs to the incremental processing family. To solve it, leverage the Incremental Sessionizer pattern.

<DiagramContainer title="Incremental Sessionizer Architecture">
  <Column gap="lg">
    <Row gap="lg" align="center">
      <Box color={colors.blue} icon="📊">Input Dataset (Hourly Partitions)</Box>
      <Box color={colors.orange} icon="⏳">Pending Sessions (Private)</Box>
    </Row>
    <Row gap="md" align="center">
      <Arrow direction="down" label="combine" />
    </Row>
    <Box color={colors.purple} icon="⚙️">Sessionization Logic</Box>
    <Row gap="md" align="center">
      <Arrow direction="down" />
    </Row>
    <Row gap="lg" align="center">
      <Box color={colors.green} icon="✅">Completed Sessions (Public)</Box>
      <Box color={colors.orange} icon="⏳">Updated Pending Sessions</Box>
    </Row>
  </Column>
</DiagramContainer>

**Implementation requires three storage spaces:**

1. **Input dataset storage:** Stores raw events you need to correlate (hourly partitioned visits)
2. **Completed sessions storage:** Where you write all finished sessions (ideally distinguished from ongoing sessions with an `is_final` attribute)
3. **Pending sessions storage:** Stores all sessions spread across multiple partitions that will be closed in subsequent executions (private, internal format, may include technical details like execution ID)

**Workflow logic:**

The logic starts by combining the input dataset with all pending sessions generated in the previous execution. The combination happens for each session entity (user, product, visit) and can generate:

- **New session:** No pending session exists for a given session entity
- **Restored session with new data:** Combines previous state with new incoming data
- **Restored session without new data:** Session may be about to expire (this or next execution)

Once you complete this combination, you get session data to process, possibly composed of previous and new records. Apply sessionization logic defining three states:

<ProcessFlow
  direction="horizontal"
  steps={[
    {
      title: "Initialization",
      description: "Session starts (e.g., visiting home page)",
      icon: "▶️",
      color: colors.blue
    },
    {
      title: "Accumulation",
      description: "Session is live (store visited pages in order)",
      icon: "📝",
      color: colors.purple
    },
    {
      title: "Finalization",
      description: "Session stops (event type or inactivity)",
      icon: "⏹️",
      color: colors.green
    }
  ]}
/>

**Processing logic definition:**

You can define processing logic with:
- `WINDOW` function
- `GROUP BY` expression followed by custom mapping function

Depending on logic complexity, implementation may be easier to express with a programmatic API than with SQL.

#### Consequences

**Inactivity period**

The inactivity period defines how long you can keep a session open. The longer it is, the more late data you can include in the session. On the other hand, you'll need more compute and storage resources to handle late data.

You should find the right balance between compute requirements and business logic—it'll be challenging to have both. What that balance is depends entirely on your specific business needs.

A long inactivity period threshold will also keep sessions in the hidden space for that amount of time. If your users can accept partial session views, you can also emit them to the output sessions storage. But there is a consistency risk your consumers must be aware of.

> **Warning**
>
> **Partial Session Risk:** A partial session is not a completed session and may change in subsequent versions. Example: In fraud detection, after processing the first partition, the partial session is classified as "not at risk," but the next partition changes the status to "risky." If consumers consider partial sessions final, they may apply wrong logic. Flag ongoing sessions with `is_completed: false` to help downstream consumers ignore them if they only care about finished state.

**Data freshness**

The Incremental Sessionizer works for batch pipelines, which are still the first choice of processing mode for data teams. As a result, insights often come very late compared to real time. To mitigate this issue while still using batch pipelines, you can create the partial sessions introduced in the previous section.

**Late data, event time partitions, and backfilling**

If your sessionization logic relies on event time partitioning, late data will be a problem as you may miss sessions for already processed partitions.

Sessions are a specific data asset that is **forward dependent**. A session generated for the partition at 09:00 directly impacts the session at 10:00, the one at 10:00 impacts the one at 11:00, and so on. Therefore, even if you manage to integrate late data for one entity, there's no guarantee that this data won't impact the next sessions.

This dependency is also visible in backfilling. If you rerun the session generation logic for one partition, you'll have to do the same for all subsequent partitions. This can become expensive very quickly.

> **Insight**
>
> **Backfilling Trade-offs:** The simple solution of replaying all partitions after the backfilled one is easy for code but costly. On the other hand, having a smart detection method to find entities to backfill and rerunning only them from a dedicated backfill pipeline optimizes cost but adds extra complexity.

#### Examples

**Incremental Sessionizer Steps with Apache Airflow**

Incremental is the key word of the pattern since it implies using a data orchestrator to coordinate loading work. Here's the task list for Apache Airflow:

<PythonRunner
  title="Incremental Sessionizer Steps"
  code={`from airflow import DAG
from airflow.providers.postgres.operators.postgres import PostgresOperator

with DAG('incremental_sessionizer', schedule_interval='@hourly') as dag:

    # Clean previous runs for idempotency
    clean_previous_runs_sessions = PostgresOperator(
        task_id='clean_previous_runs_sessions',
        sql="DELETE FROM dedp.sessions WHERE execution_time_id >= '{{ ds }}'"
    )

    clean_previous_runs_pending_sessions = PostgresOperator(
        task_id='clean_previous_runs_pending_sessions',
        sql="DELETE FROM dedp.pending_sessions WHERE execution_time_id >= '{{ ds }}'"
    )

    # Generate sessions
    generate_sessions = PostgresOperator(
        task_id='generate_sessions',
        sql='session_generation.sql'
    )

    # Task dependencies
    [clean_previous_runs_sessions, clean_previous_runs_pending_sessions] >> generate_sessions`}
/>

The pipeline starts with two simultaneous tasks that clean all completed and pending sessions generated in this and all subsequent executions using simple `DELETE FROM` statements applied to Apache Airflow's immutable `ds` parameter.

**Session Generation: Loading New Data**

After context preparation, the pipeline runs the session generation query composed of four blocks. First, load all input data into a temporary and session-scoped visits table:

<CodeRunner
  language="sql"
  title="Session Generation: Loading New Data"
  code={`CREATE TEMPORARY TABLE visits_{{ ds_nodash }} (
    visit_id CHAR(36) NOT NULL,
    user_id TEXT NOT NULL,
    event_time TIMESTAMP NOT NULL,
    page VARCHAR(255) NOT NULL
);

COPY visits_{{ ds_nodash }}
FROM '/data_to_load/date={{ ds_nodash }}/dataset.csv'
CSV;`}
/>

If the session query fails, you won't have to replay the loading step each time.

**Session Generation: The Logic**

Next, the session generation logic combines input data with pending sessions. An important thing: use an idempotent property to identify previously generated pending sessions. This snippet leverages Apache Airflow's execution time for that:

<CodeRunner
  language="sql"
  title="Session Generation: The Logic"
  code={`CREATE TEMPORARY TABLE sessions_to_classify AS
SELECT
  COALESCE(p.session_id, n.session_id) AS session_id,
  COALESCE(p.user_id, n.user_id) AS user_id,
  LEAST(p.start_time, n.start_time) AS start_time,
  GREATEST(p.last_visit_time, n.start_time) AS last_visit_time,
  ARRAY_CAT(p.pages, n.pages) AS pages,
  CASE
    WHEN n.user_id IS NULL THEN p.expiration_batch_id
    ELSE '{{ macros.ds_add(ds, 2) }}'
  END AS expiration_batch_id
FROM (
  -- New data with window function
  SELECT
    visit_id,
    user_id,
    MIN(event_time) OVER visits_window AS start_time,
    event_time AS last_visit_time,
    ARRAY_AGG(page) OVER visits_window AS pages
  FROM visits_{{ ds_nodash }}
  WINDOW visits_window AS (PARTITION BY visit_id, user_id ORDER BY event_time)
) AS n
FULL OUTER JOIN (
  -- Pending sessions from previous run
  SELECT * FROM dedp.pending_sessions
  WHERE execution_time_id = '{{ prev_ds }}'
) AS p
ON n.session_id = p.session_id;`}
/>

The query applies the `WINDOW` function to new data so visits get formatted into the same schema as pending sessions. It uses facility methods: `COALESCE` (first nonnull element), `LEAST`/`GREATEST` (first/last values), and `ARRAY_CAT` (concatenate arrays). Finally, it computes session expiration time only when the session has new data.

**Session Generation: The Writing Component**

In the end, there are two writing steps:

<CodeRunner
  language="sql"
  title="Session Generation: The Writing Component"
  code={`-- Write pending sessions (not yet expired)
INSERT INTO dedp.pending_sessions (
    session_id, user_id, start_time, last_visit_time,
    pages, expiration_batch_id, execution_time_id
)
SELECT
    session_id, user_id, start_time, last_visit_time,
    pages, expiration_batch_id, '{{ ds }}' AS execution_time_id
FROM sessions_to_classify
WHERE expiration_batch_id != '{{ ds }}';

-- Write completed sessions (expired)
INSERT INTO dedp.sessions (
    session_id, user_id, start_time, end_time,
    pages, execution_time_id
)
SELECT
    session_id, user_id, start_time, last_visit_time AS end_time,
    pages, '{{ ds }}' AS execution_time_id
FROM sessions_to_classify
WHERE expiration_batch_id = '{{ ds }}';`}
/>

The first `INSERT` writes all pending sessions (sessions whose expiration time is different than the current run). The second writes all finished sessions.

---

### 5.2. Pattern: Stateful Sessionizer

**In plain English:** Stateful Sessionizer is like a live sports scoreboard—it continuously updates the score as the game progresses, maintaining running totals and immediately showing results without waiting for the game to end.

**In technical terms:** The Stateful Sessionizer pattern generates sessions in streaming pipelines by maintaining in-flight session state in a state store that persists pending sessions throughout processing, enabling near-real-time session generation with event time or processing time-based expiration.

**Why it matters:** When data freshness is critical and batch pipeline latency is unacceptable, stateful sessionization enables near-real-time session generation from streaming data sources with minimal delay.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that generates sessions in streaming pipelines by maintaining in-flight session state in a state store that persists pending sessions throughout processing. |
| **When to use** | ✓ Data freshness is critical and batch latency unacceptable ✓ Visits available in streaming broker within seconds ✓ Need near-real-time session generation |
| **Core problem** | At-least-once processing and scaling costs—checkpointing doesn't happen on every state update, leading to at-least-once semantics; changing compute capacity involves costly state rebalancing. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Session windows (gap duration) | Standard session with fixed inactivity period |
| Arbitrary stateful processing | Need dynamic gap duration or complex session logic |
| Event time-based expiration | More reliable and should be preferred in most cases |

> 📁 **Full code**: [chapter-05/04-sessionization](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/04-sessionization)

---

#### Problem

Stakeholders are now quite happy with session availability. However, more and more of them need to access sessions in lower latency. That's impossible to achieve with the Incremental Sessionizer as the partitions are hourly based and the best latency you can provide is one hour.

The good news is that visits are also available in your streaming broker within seconds. You are looking for a way to rewrite the batch pipeline and generate sessions in near real time.

#### Solution

Achieving "as soon as possible" guarantee for sessions is hard with batch pipelines, but default streaming pipelines won't help either because they are stateless. You need to use a more advanced version and solve the problem with the Stateful Sessionizer pattern.

<DiagramContainer title="Stateful Sessionizer Architecture">
  <Column gap="lg">
    <Box color={colors.blue} icon="⚡">Streaming Input</Box>
    <Row gap="md" align="center">
      <Arrow direction="down" />
    </Row>
    <Row gap="lg" align="center">
      <Box color={colors.purple} icon="⚙️">Stateful Processing Job</Box>
      <Box color={colors.orange} icon="💾">State Store (Memory)</Box>
    </Row>
    <Row gap="md" align="center">
      <Arrow direction="down" label="checkpoint" />
    </Row>
    <Box color={colors.slate} icon="🗄️">Fault Tolerance Storage</Box>
    <Row gap="md" align="center">
      <Arrow direction="down" label="completed" />
    </Row>
    <Box color={colors.green} icon="✅">Output Sessions</Box>
  </Column>
</DiagramContainer>

**How is that different from stateless streaming pipelines?**

Stateful pipelines bring an extra component called a **state store** (discovered in the Windowed Deduplicator pattern). In sessionization context, the state store plays the same role as the pending sessions storage zone in the Incremental Sessionizer—it persists all in-flight sessions and keeps them available throughout processing.

**Workflow similarities:**

The Stateful Sessionizer's implementation follows the same workflow as the Incremental Sessionizer:

1. **Create or resume:** Create a session or resume it if present in the state store
2. **Combine and accumulate:** Combine created/resumed session with new incoming records according to business logic (e.g., store visited pages in order)
3. **Transform and write:** If the session is completed or partial sessions need availability, transform and write the pending session record to final output. If not completed, also write new state to the state store

**State Store Interaction**

If you implement the pattern on top of a data processing framework, you'll likely get state store support out of the box. Otherwise, you'll need to code these interactions.

The state store has two flavors:
- **Fast access (memory):** Lives in memory for speed but is volatile
- **Fault tolerance (persistent):** Job synchronizes state regularly to resilient storage to overcome loss risk

**Data Processing Abstractions**

The data processing logic can rely on:

<CardGrid
  columns={2}
  cards={[
    {
      title: "Session Windows",
      icon: "⏱️",
      color: colors.blue,
      items: [
        "Window per session key",
        "Gap duration defines max inactivity",
        "Automatic window creation"
      ]
    },
    {
      title: "Arbitrary Stateful Processing",
      icon: "⚙️",
      color: colors.purple,
      items: [
        "More implementation effort",
        "Greater flexibility",
        "Custom gap duration logic"
      ]
    }
  ]}
/>

**Session Windows**

A session window is a window created for each session key. Its length is specified by a gap duration—the maximum allowable period of inactivity between two events with the same session key.

If the amount of time between two events with the same session key is greater than the gap duration, a new session window will be created. If not, the new event will be part of the already opened session.

Example: With a gap duration of 20 minutes, two session windows are created once the difference between events exceeds this threshold.

**Arbitrary Stateful Processing**

This approach requires more implementation effort than session windows but provides more flexibility. It's up to you to define gap duration logic, which can be:
- A static timer
- A dynamic operation, possibly different for each session key

Modern data engineering frameworks provide this capability out of the box:
- Apache Spark Structured Streaming
- Apache Flink
- GCP Dataflow

#### Consequences

Fault tolerance and the state store, despite their positive impact, also have gotchas:

**At-least-once processing**

Saving state on fault tolerance storage doesn't happen during every state update. Instead, the writing process (checkpointing) occurs irregularly. Any stopped job restarts from the last successful checkpoint, leading to at-least-once processing.

This semantic is not bad in itself, but it's better to be aware of it and avoid side effects of operations that might impact session idempotency—such as relying on attributes that change between runs to generate the session key. An example: real time, which obviously will be different at each restart.

**Scaling**

Changing compute capacity in this stateful context may involve state rebalancing. This means the job will not be able to process data as long as particular state keys are not assigned to new workers. That doesn't make scaling impossible, but it makes it more costly than for stateless jobs.

**Inactivity period length**

As for the Incremental Sessionizer, you'll need to strike the right balance to keep total cost acceptable and include as many sessions as possible. Having a longer inactivity period implies more hardware pressure and output freshness.

**Inactivity period time**

Besides emitting sessions to output storage, the solution will also need to manage expiration of state for all completed sessions. The cleaning relies on two different temporal aspects:

> **Insight**
>
> **Event Time vs Processing Time:** Event time from incoming events is more reliable and should be preferred in most cases. Processing time-based logic relies on current time, meaning any unexpected latency (e.g., due to writing retries) may cause sessions to expire too early. Because of this unpredictability, it's always easier to reason in terms of event time in stateful pipelines.

#### Examples

**Stateful Mapping in PySpark**

To help you understand the Stateful Sessionizer, let's implement a sessionization job with Apache Spark and arbitrary stateful processing. The key part is the method:

<PythonRunner
  title="Stateful Mapping in PySpark"
  code={`from pyspark.sql import functions as F
from pyspark.sql.types import *

# Define watermark and grouping
grouped_visits = (visits_from_kafka
    .withWatermark('event_time', '1 minute')
    .groupBy(F.col('visit_id')))

# Define output structure
visited_pages_type = ArrayType(StructType([
    StructField("page", StringType()),
    StructField("event_time_as_ms", LongType())
]))

# Apply stateful transformation
sessions = grouped_visits.applyInPandasWithState(
    func=map_visits_to_session,
    outputStructType=StructType([
        StructField("visit_id", StringType()),
        StructField("user_id", StringType()),
        StructField("start_time", TimestampType()),
        StructField("end_time", TimestampType()),
        StructField("visited_pages", visited_pages_type),
        StructField("duration_in_milliseconds", LongType())
    ]),
    stateStructType=StructType([
        StructField("visits", visited_pages_type),
        StructField("user_id", StringType())
    ]),
    outputMode="update",
    timeoutConf="EventTimeTimeout"
)`}
/>

The logic defines:
- **Expiration column:** `event_time`
- **Grouping key:** `visit_id`
- **func:** Function with stateful logic
- **outputStructType:** Structure of session written to output location
- **stateStructType:** Structure of pending session interacting with state store
- **outputMode:** Configure output generation to updated rows
- **timeoutConf:** Session expiration configuration based on event time

**Session Generation Logic: High-Level View**

The real generation and accumulation logic is present in the `map_visits_to_session` function:

<PythonRunner
  title="Session Generation Logic: High-Level View"
  code={`import pandas
from typing import Any, Iterable, Optional
from pyspark.sql.streaming.state import GroupState

def map_visits_to_session(
    visit_id_tuple: Any,
    input_rows: Iterable[pandas.DataFrame],
    current_state: GroupState
) -> Iterable[pandas.DataFrame]:

    session_expiration_time_10min_as_ms = 10 * 60 * 1000
    visit_id = visit_id_tuple[0]
    visit_to_return = None

    if current_state.hasTimedOut:
        # Session has expired - emit final result
        visits, user_id = current_state.get
        visit_to_return = get_session_to_return(visits, user_id)
        current_state.remove()
    else:
        # Session still active - apply accumulation logic
        # ... (accumulation logic shown next)
        pass

    if visit_to_return:
        yield pandas.DataFrame(visit_to_return)`}
/>

The code first detects whether the session state has timed out. If it has, the code aggregates accumulated values into final format. If the state is still active, the code applies accumulation logic.

**Expiration Base Time Detection**

The accumulation logic has two parts. First, detect the base time for state expiration. Since the watermark will be missing in the first job iteration, use either event time or watermark:

<PythonRunner
  title="Expiration Base Time Detection"
  code={`# Part of the accumulation logic
should_use_event_time_for_watermark = current_state.getCurrentWatermarkMs() == 0
base_watermark = current_state.getCurrentWatermarkMs()
new_visits = []
user_id = None

for input_df_for_group in input_rows:
    # Convert event time to milliseconds
    input_df_for_group['event_time_as_ms'] = (
        input_df_for_group['event_time']
        .apply(lambda x: int(pandas.Timestamp(x).timestamp()) * 1000)
    )

    # Use event time for first iteration
    if should_use_event_time_for_watermark:
        base_watermark = int(input_df_for_group['event_time_as_ms'].max())

    # Accumulate visits
    user_id = input_df_for_group['user_id'].iloc[0]
    new_visits.extend([
        {'page': row.page, 'event_time_as_ms': row.event_time_as_ms}
        for _, row in input_df_for_group.iterrows()
    ])`}
/>

**Why not use event time every time?**

Relying on a watermark is better because it's related to job progress and the `.withWatermark('event_time', '1 minute')` operation. Here's an example with 1-minute watermark and 10-minute state expiration:

| State key | Event time | Expiration times | New watermark |
|-----------|-----------|------------------|---------------|
| A | 10:00 | Watermark: 10:10, Event-time: 10:10 | 09:59 |
| A | 10:01 | Watermark: 10:09, Event-time: 10:11 | 10:00 |
| A | 10:08 | Watermark: 10:10, Event-time: 10:18 | 10:07 |
| B | 10:15 | Watermark: 10:17, Event-time: 10:25 | 10:14 |

Key A is active for eight minutes. According to the watermark expiration strategy, it could be emitted right after processing the first element of state B (10:10 < 10:14). However, that's not the case with event-time strategy as the expiration time is beyond the new watermark (10:18 > 10:14).

**State and Expiration Time Update**

After the expiration section comes the second part of logic—interacting with the state store:

<PythonRunner
  title="State and Expiration Time Update"
  code={`# Load previous state
visits_so_far = []
if current_state.exists:
    visits_so_far, user_id = current_state.get

# Update state with new visits
visits_for_state = visits_so_far + new_visits
current_state.update((visits_for_state, user_id))

# Set expiration timestamp
timeout_timestamp = base_watermark + session_expiration_time_10min_as_ms
current_state.setTimeoutTimestamp(timeout_timestamp)`}
/>

The function loads the previous state and updates the in-flight session with the new expiration time.

**Session Window with Apache Flink**

The example relying on session windows is much simpler. Here's how to define it with Apache Flink:

<CodeRunner
  language="python"
  title="Session Window with Apache Flink"
  code={`from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.window import EventTimeSessionWindows, Time

env = StreamExecutionEnvironment.get_execution_environment()

# Define session window
sessions = (visits_input_data_stream
    .key_by(VisitIdSelector())
    .window(EventTimeSessionWindows.with_gap(Time.minutes(10)))
    .allowed_lateness(Time.minutes(15).to_milliseconds())
    .process(VisitToSessionConverter(), Types.STRING())
    .uid('sessionizer'))`}
/>

The transformation starts with code extracting the session key. Next, the code configures the session window with:
- **10-minute gap duration:** Maximum inactivity between events
- **15-minute allowed lateness:** How late events can be integrated into already emitted session windows

In the end, the `VisitToSessionConverter` converts all records from the window into the final output structure.

---

## 6. Data Ordering

**In plain English:** Data ordering is like timestamping and sequencing photos from a vacation—it transforms random snapshots into a chronological story that makes sense.

**In technical terms:** Data ordering patterns guarantee delivery sequence for records through bulk operations with bin packing or individual FIFO delivery, overcoming challenges like partial commits and network latency to maintain chronological integrity.

**Why it matters:** Many use cases require chronological data delivery for real-time insight. Imagine a car fleet tracking system that doesn't respect position order—you'd see cars jumping over buildings or swimming across rivers instead of following their ordered, real positions on roads.

Data transformation resulting from data aggregation and combination is not the only valuable property with which you can enhance your dataset. Another is order—for example, events delivered chronologically to downstream consumers. Even though this feature is often reduced to an `ORDER BY` clause in SQL, ordered data delivery is challenging.

Depending on your data store, you will likely provide ordering guarantee via one of two available patterns.

### 6.1. Pattern: Bin Pack Orderer

**In plain English:** Bin Pack Orderer is like organizing packages for delivery trucks—you group items by route in separate bins, ensuring each truck delivers all packages on its route in order, even if one truck gets delayed.

**In technical terms:** The Bin Pack Orderer pattern guarantees ordered delivery in the context of partial commit semantics by sorting records by grouping key and time, then packing rows into delivery bins where each bin contains only one occurrence of each grouping key, enabling sequential delivery without ordering conflicts on retries.

**Why it matters:** When your data store has partial commit semantics (can succeed on some records while failing on others), simple bulk operations can break ordering. Bin packing maintains order guarantees while preserving bulk operation performance benefits.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that guarantees ordered delivery with partial commit semantics by sorting records and packing rows into delivery bins where each bin contains only one occurrence of each grouping key. |
| **When to use** | ✓ Data store has partial commit semantics ✓ Events must be delivered in event time order ✓ Need to optimize network traffic with bulk operations |
| **Core problem** | Retries and complexity—pattern guarantees ordering inside same execution, but whole pipeline failures break overall ordering; requires custom sorting and bin creation logic instead of simple sort function. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Sort by grouping key + time, then pack into bins | Standard approach for partial commit systems |
| Sequential bin delivery with acknowledgment | Each bin fully written before next bin delivery starts |
| Local sorting (sortWithinPartitions) | Optimize by avoiding network exchange during preparation |

> 📁 **Full code**: [chapter-05/05-data-ordering](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/05-data-ordering)

---

#### Problem

Your blogging platform enables external websites to embed your pages. Visit events generated by these embeddings are arriving in your system, and you're processing them as your own events. Besides keeping them internally, you need to expose them from an external API to external websites for analytics purposes.

The project is reaching the last stage, and you need to write the synchronization job to feed the external API storage. To optimize cost, the job must be common for all partners. It has to create a processing time window of 10 minutes with per-minute aggregates, and in the end, it must flush the buffer to different outputs provided by partners. The events must be delivered individually for each minute and provider, and in event time order.

Unfortunately, the API ingestion storage is a streaming broker with partial commit semantics. You need to be particularly careful while implementing the ordering logic to overcome any issues related to retries.

> **Warning**
>
> **Partial Commits:** Unlike classical commits where only two states (success and failure) are possible, partial commits have one more state for partial failure. In that state, the database manages to ingest only a subset of records.
>
> Why can this break ordering? Example: Records timestamped with 10:00, 10:10, and 10:20. The database can write all, two, one, or none. The two scenarios in the middle are risky—there's no way to know which records haven't been delivered and when they'll succeed. If only 10:20 has been written, you'll need to retry 10:00 and 10:10, leaving you with out-of-order writing.
>
> You'll find this partial commit semantic in: PutRecords API (Amazon Kinesis Data Streams), BatchWriteItem (AWS DynamoDB), and bulk operation (Elasticsearch).

#### Solution

You can solve the problem by delivering each record individually. However, that implies significant network overhead as you'll need to initialize as many requests as there are records. You can mitigate the issue by relying on bulk operations that together with the Bin Pack Orderer pattern can guarantee ordered delivery in the context of partial commits.

<DiagramContainer title="Bin Pack Orderer Workflow">
  <ProcessFlow
    direction="vertical"
    steps={[
      {
        title: "Step 1: Sort",
        description: "Sort records by grouping key and event time",
        icon: "1️⃣",
        color: colors.blue
      },
      {
        title: "Step 2: Pack",
        description: "Group events of different entities in bins (one per entity per bin)",
        icon: "2️⃣",
        color: colors.purple
      },
      {
        title: "Step 3: Deliver",
        description: "Emit bins sequentially, retry locally within bin",
        icon: "3️⃣",
        color: colors.green
      }
    ]}
  />
</DiagramContainer>

**Implementation follows two important steps:**

1. **Grouping and sorting:** Group all related events and sort them (sort by grouping key and event time operation)
2. **Bin packing:** Pack rows in bins individually—group events of different entities sharing the same position together in the same bin

This creates isolated subsets that you can deliver through a bulk API without worrying about completeness, duplicates, and most importantly, partial commits.

**Workflow:**

1. Sort records by grouping key and time
2. Place sorted rows into delivery bins so there is only one grouping key occurrence in each bin (bins can be arrays or lists)
3. Emit bins sequentially—if there's any retry within the delivery bin, it remains local to the group (doesn't interfere with ordering for the retried grouping key because there's only a single occurrence per bin)

The next bin isn't delivered as long as the current one is not fully written to output.

#### Consequences

The pattern looks great for ordering guarantee, but if your compute runtime is not adapted, some items may still be out of order:

**Retries**

The pattern guarantees ordering inside the same execution. If your whole pipeline fails, then the retry will involve already emitted results. Consequently, the overall ordering will be broken despite using the pattern.

**Complexity**

The bin packer is definitely more difficult to implement than classical sort. It requires custom sorting and bin creation logic, whereas performing classical sorting is just a matter of calling an appropriate sorting function.

#### Examples

**Bin Packer Preparation Step**

Let's see how to implement the pattern with Apache Spark and Amazon Kinesis Data Streams. First, the preparation step uses a local sorting mechanism:

<PythonRunner
  title="Bin Packer Preparation Step"
  code={`from pyspark.sql import functions as F

# Sort within partitions (no shuffle)
sorted_events = events.sortWithinPartitions([
    F.col('visit_id'),
    F.col('event_time')
])

# Process each partition with bin packing
sorted_events.foreachPartition(
    lambda rows: write_records_to_kinesis('output-stream', rows)
)`}
/>

The Bin Pack Orderer pattern sorts input rows by `visit_id` and later, inside each group, by `event_time`. Prepared rows are later processed via the `write_records_to_kinesis` method.

**Bin Pack Orderer for Amazon Kinesis Data Streams**

<PythonRunner
  title="Bin Pack Orderer for Amazon Kinesis Data Streams"
  code={`import boto3
from typing import Optional

def write_records_to_kinesis(output_stream, visits_rows):
    producer = boto3.client('kinesis')
    delivery_groups = []
    groups_index = 0
    last_visit_id: Optional[str] = None

    # Pack rows into bins
    for visit in visits_rows:
        if visit.visit_id != last_visit_id:
            # New visit_id - reset to first bin
            last_visit_id = visit.visit_id
            groups_index = 0

        # Create bin if needed
        if len(delivery_groups) <= groups_index:
            delivery_groups.append([])

        # Add visit to current bin
        delivery_groups[groups_index].append(visit)
        groups_index += 1

    # Deliver bins sequentially
    for group in delivery_groups:
        records = [{'Data': visit.to_json(), 'PartitionKey': visit.visit_id}
                   for visit in group]
        producer.put_records(StreamName=output_stream, Records=records)`}
/>

The code iterates all input rows and puts each into a dedicated bin, as long as the `visit_id` doesn't change. If it does, the bin's position is reset to 0. After this preparation step comes the delivery, group by group, to the Kinesis output stream.

---

### 6.2. Pattern: FIFO Orderer

**In plain English:** FIFO Orderer is like a single-file checkout line at the grocery store—customers are served one at a time in the exact order they arrived, simple and guaranteed.

**In technical terms:** The FIFO Orderer pattern delivers records in first-in, first-out order by sending data individually or through bulk API with concurrency level set to 1, avoiding buffering and bulk optimizations in favor of guaranteed sequential delivery for low-volume or latency-sensitive scenarios.

**Why it matters:** When delivery volume is manageable and immediate delivery is critical, FIFO Orderer provides the simplest guaranteed ordering without complex bin packing logic.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that delivers records in first-in, first-out order by sending data individually or through bulk API with concurrency level set to 1, avoiding buffering optimizations. |
| **When to use** | ✓ Delivery volume is manageable and not high ✓ Immediate delivery is critical ✓ Use cases don't require low latency at scale |
| **Core problem** | I/O overhead and latency—sends one request for each input row instead of one request for many records, leading to increased latency as data store and producer must handle requests individually. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Individual record delivery (PutRecord, send+flush) | Simplest approach for guaranteed ordering |
| Bulk API with concurrency=1 | Data store supports full commit semantics |
| Idempotent producer (Kafka, up to 5 concurrent) | Need better throughput while maintaining ordering |

> 📁 **Full code**: [chapter-05/05-data-ordering](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-05/05-data-ordering)

---

#### Problem

One of your streaming jobs runs on top of the visits dataset. It needs to detect a subset of particular events and forward them in processing order to a different stream. The requirement is to deliver each record as soon as possible, so any buffering to optimize network traffic is not an option.

#### Solution

Buffering and bulk requests help reduce network overhead in data transmission. However, in environments with more relaxed delivery constraints, you may want to consider a simpler alternative: the FIFO Orderer pattern.

<DiagramContainer title="FIFO Orderer Implementations">
  <CardGrid
    columns={2}
    cards={[
      {
        title: "Individual Records",
        icon: "1️⃣",
        color: colors.blue,
        items: ["One record per request", "Immediate acknowledgment", "Simple but high overhead"]
      },
      {
        title: "Bulk API (Concurrency=1)",
        icon: "📦",
        color: colors.purple,
        items: ["Full commit semantics only", "Buffered delivery", "Better throughput"]
      }
    ]}
  />
</DiagramContainer>

The implementation is more straightforward than the Bin Pack Orderer. It doesn't require any specific sorting algorithm since the requirement is to send data in first in, first out (FIFO) manner. Instead, it only:
1. Detects the records
2. Issues the delivery request

**Important:** Get the delivery acknowledgment for each record before proceeding to the next one. Otherwise, it may lead to issues of data being out of order or lost.

**Implementation Options:**

1. **Individual delivery API:** One record at a time
   - AWS Kinesis Data Streams' `PutRecord` API
   - Apache Kafka's `send()` followed by synchronous `flush()` invocation

2. **Bulk API with concurrency=1:** For data stores supporting full commit semantics
   - Apache Kafka: Set `max.in.flight.requests.per.connection` to 1
   - Apache Kafka: Use idempotent producer feature (accepts up to 5 concurrent requests with ordering guarantee)

> **Insight**
>
> **In-Flight Requests:** Using in-flight requests optimizes throughput. The producer can issue delivery requests for the first bulk API and then, without waiting for server response, create and deliver the next one. However, this can break ordering. Example: If only the second of two in-flight requests succeeds and the first is retried, the ordering between them will be broken.

#### Consequences

The pattern's simplicity is appealing, but you shouldn't consider it for all use cases involving FIFO delivery:

**I/O overhead and latency**

The biggest drawback, despite the possibility of using bulk API under some conditions in some data stores, is the I/O overhead and resulting increased latency. Instead of sending one network request for many records, the FIFO Orderer pattern sends one request for each input row.

This overhead leads to increased latency as the data store and data producer must handle requests individually. The problem will be particularly visible if you have a lot of data to deliver and monitoring shows increasing backlog of records to deliver per minute.

**Mitigation:** You can slightly reduce impact by leveraging multithreading—issuing individual requests from multiple processes of your producer. The only problem is guaranteeing ordering between these processes because they're isolated and not aware of each other.

**Strategy:** Create scopes of ordered records. If you need to guarantee ordering for an entity such as user or product, allocate all records of that entity to the same process. This looks similar to bins, except that each container stores all records of the same entity and delivers each individually from the asynchronous process.

**FIFO is not exactly once**

Don't get this wrong: FIFO stands only for delivering the oldest records first, and it doesn't guarantee exactly-once delivery by itself.

> **Warning**
>
> **Exactly-Once Challenge:** Even after successful `send()`, the subsequent `ack()` call can fail. As a result, the exactly-once guarantee will be broken after code restarts because the producer will try to send already delivered records. To mitigate this issue, rely on one of the idempotency patterns from Chapter 4.

#### Examples

**FIFO Orderer with Individual Records Delivery**

How do you implement the FIFO Orderer with Apache Kafka? Here's the most basic implementation:

<CodeRunner
  language="python"
  title="FIFO Orderer with Individual Records Delivery"
  code={`from confluent_kafka import Producer

producer = Producer({'bootstrap.servers': 'localhost:9092'})

# For each record:
producer.produce(topic='visits', value=record_value, key=record_key)
producer.flush()  # Wait for acknowledgment`}
/>

It's pretty easy—produce a record, flush the buffer immediately, and wait for the broker to perform the write. But as you know, it's costly in terms of network traffic because you send one record at a time.

**FIFO Orderer with Bulk Requests**

Can you do better? Yes, there's an alternative with bulk requests:

<CodeRunner
  language="python"
  title="FIFO Orderer with Bulk Requests"
  code={`from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': 'localhost:9092',
    'max.in.flight.requests.per.connection': 1,
    'queue.buffering.max.ms': 1000
})

# Produce records - buffering happens automatically
producer.produce(topic='visits', value=record_value, key=record_key)
# No explicit flush - producer buffers for 1 second`}
/>

This doesn't perform `flush()`. Instead, it delegates bulk request generation to the producer, who is asked to buffer records for at most one second. Also, to avoid the issue of concurrent writes, the concurrency flag is set to 1.

This approach is indeed more efficient than individual delivery, but the single concurrency flag may still be a slowness factor.

**FIFO Orderer with Idempotent Producer**

To optimize that part, you can use the idempotent producer configuration:

<CodeRunner
  language="python"
  title="FIFO Orderer with Idempotent Producer"
  code={`from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': 'localhost:9092',
    'max.in.flight.requests.per.connection': 5,
    'enable.idempotence': True,
    'queue.buffering.max.ms': 2000
})

# Produce records with ordering guarantee
producer.produce(topic='visits', value=record_value, key=record_key)`}
/>

This uses Apache Kafka's idempotent producer, which accepts up to five concurrent requests and still guarantees ordering. The configuration also increases buffering time so there's a greater chance to fill the buffer and issue more bulk requests to the broker.

**Using SequenceNumberForOrdering in AWS Kinesis Data Streams**

Unfortunately, you may not always have a chance to leverage bulk API for FIFO delivery. It won't be possible on data stores with partial commit semantics, where you'll have to rely on individual requests:

<CodeRunner
  language="python"
  title="Using SequenceNumberForOrdering in AWS Kinesis Data Streams"
  code={`import boto3

client = boto3.client('kinesis')
records_to_deliver = [...]
previous_sequence_number = None

for record in records_to_deliver:
    put_result = client.put_record(
        StreamName='visits-stream',
        Data=record.to_json(),
        PartitionKey=record.visit_id,
        SequenceNumberForOrdering=previous_sequence_number
    )
    previous_sequence_number = put_result['SequenceNumber']`}
/>

Without the `SequenceNumberForOrdering` property, Kinesis may put records in rough order.

**Using ordering_key for GCP Pub/Sub**

Another cloud streaming service, GCP Pub/Sub, also has a built-in ordering guarantee mechanism, but it works only within the same producer writing to the single region. The feature requires setting an `ordering_key` attribute:

<CodeRunner
  language="python"
  title="Using ordering_key for GCP Pub/Sub"
  code={`from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path('project-id', 'topic-name')

records_to_deliver = [
    Record(data='...', ordering_key='a'),
    Record(data='...', ordering_key='b'),
    Record(data='...', ordering_key='c'),
    Record(data='...', ordering_key='a')
]

for record in records_to_deliver:
    publisher.publish(
        topic_path,
        data=record.data.encode('utf-8'),
        ordering_key=record.ordering_key
    )`}
/>

Unlike the `SequenceNumberForOrdering`, it's more of a grouping key used by Pub/Sub's publisher to ensure all records sharing it are delivered in the FIFO manner.

---

## 7. Summary

In this chapter, you discovered common ways to increase the value of your dataset. Generally, two improvement scenarios are possible:

1. **When you add information to the input data**
2. **When you reduce the information to make it more understandable**

### Key Takeaways

**Data Enrichment and Decoration**

In the first scenario, you can use data enrichment and data decoration patterns. Data enrichment patterns are great candidates for combining datasets. You saw this is possible not only for homogeneous pipelines but also for heterogeneous ones, where streaming meets the batch world.

When it comes to data decoration patterns, you learned about two approaches to annotating raw records:
- **Wrapper pattern:** Wraps input data and computes extra attributes separately—a great way to introduce data consistency in terms of data representation
- **Metadata Decorator pattern:** Hides extra attributes with the hidden metadata layer if they're not relevant to end users

**Data Aggregation and Sessionization**

In the second scenario, information is reduced with the goal of making data more understandable. Here, data aggregation patterns work in distributed or local environments:
- **Distributed Aggregator:** Leverages multiple machines in a cluster to process large-scale datasets with shuffle operations
- **Local Aggregator:** Avoids shuffle by leveraging pre-partitioned data sources for improved performance

In addition, this is where you'll summarize your users' experience with sessionization patterns:
- **Incremental Sessionizer:** Adapted to incremental batch workloads with pending and completed session storage
- **Stateful Sessionizer:** Adapted to real-time streaming pipelines with state store management

**Data Ordering**

Finally, you learned about two solutions to preserve correct order:
- **Bin Pack Orderer:** Addresses ordering requirements in the context of data stores with partial commit semantics by packing records into delivery bins
- **FIFO Orderer:** An alternative that sacrifices network exchange optimization for simplicity

### What's Next

You've learned how to ingest data and generate value with data value patterns supported by error management and idempotency patterns. However, there's still one point missing: **How do you connect them all?**

The good news is that the next chapter is all about that topic!

---

**Previous:** [Chapter 4: Idempotency Design Patterns](./chapter4) | **Next:** [Chapter 6: Data Flow Design Patterns](./chapter6)
