---
sidebar_position: 10
title: "Chapter 10: Data Observability Design Patterns"
description: "Master data observability patterns including flow interruption detection, skew detection, lag monitoring, SLA tracking, and data lineage to ensure end-to-end control of your data engineering stack."
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';
import CodeRunner from '@site/src/components/CodeRunner';

# Chapter 10: Data Observability Design Patterns

> **"Observability is not just about monitoring; it's about understanding the complete journey of your data from source to consumption."**
>
> — Data Engineering Wisdom

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Detectors](#2-data-detectors)
   - 2.1. [Pattern: Flow Interruption Detector](#21-pattern-flow-interruption-detector)
   - 2.2. [Pattern: Skew Detector](#22-pattern-skew-detector)
3. [Time Detectors](#3-time-detectors)
   - 3.1. [Pattern: Lag Detector](#31-pattern-lag-detector)
   - 3.2. [Pattern: SLA Misses Detector](#32-pattern-sla-misses-detector)
4. [Data Lineage](#4-data-lineage)
   - 4.1. [Pattern: Dataset Tracker](#41-pattern-dataset-tracker)
   - 4.2. [Pattern: Fine-Grained Tracker](#42-pattern-fine-grained-tracker)
5. [Summary](#5-summary)

---

## 1. Introduction

**In plain English:** Think of data observability like having a security system for your house - it's not enough to just lock your doors (data quality); you also need sensors, cameras, and alarms to monitor what's happening inside and outside your home.

**In technical terms:** Data observability design patterns extend beyond data quality checks by providing comprehensive monitoring and alerting capabilities across the entire data engineering stack, focusing on detection and tracking mechanisms.

**Why it matters:** Even with perfect data quality patterns like AWAP (Audit-Write-Audit-Publish), your system can fail silently. For example, if your AWAP job doesn't run due to an upstream flow interruption and you're unaware of it, your consumers will be affected. Observability patterns fill these critical gaps.

### The Two Pillars of Observability

<CardGrid
  columns={2}
  cards={[
    {
      title: "Detection",
      icon: "🔍",
      color: colors.blue,
      items: [
        "Spots problems related to data or time",
        "Handles data flow interruption issues",
        "Notifies when batch jobs take too long",
        "Prevents silent failures"
      ]
    },
    {
      title: "Tracking",
      icon: "🗺️",
      color: colors.purple,
      items: [
        "Understands dataset relationships",
        "Maps data generation graphs",
        "Tracks column transformations",
        "Spans across team boundaries"
      ]
    }
  ]}
/>

> **Insight**
>
> Data observability is not just "operations team work" - it's a crucial responsibility for data engineers. Without observability, you're flying blind, relying on consumer complaints rather than proactive monitoring to catch issues.

---

## 2. Data Detectors

**In plain English:** Data detectors are like smoke detectors for your data pipelines - they alert you when something goes wrong with the data itself, whether it's missing, incomplete, or unbalanced.

**In technical terms:** Data detectors analyze the health of data processing systems by monitoring data availability, completeness, and distribution patterns.

**Why it matters:** Processing data is the core of data engineering. If your data is unavailable or skewed, all downstream systems suffer, making these detectors your first line of defense.

---

### 2.1. Pattern: Flow Interruption Detector

#### Problem

One of your streaming jobs synchronizes data to an object store. The synchronized dataset serves as the data source for many batch jobs managed by different teams. It ran perfectly for seven months until one day it processed input records without writing them to the object store.

**The Silent Failure:** Because the job didn't fail with an error, you didn't notice the issue. You only realized something was wrong when consumers complained about missing data. Instead of relying on consumer feedback (which damages your reputation), you need an observability mechanism to detect data unavailability scenarios proactively.

#### Solution

The **Flow Interruption Detector** pattern captures data unavailability errors and increases trust in your data pipelines.

**Implementation varies by processing mode:**

<ProcessFlow
  direction="vertical"
  steps={[
    {
      title: "Streaming Processing",
      description: "Monitor continuous or irregular data delivery",
      icon: "🌊",
      color: colors.blue
    },
    {
      title: "Batch Processing",
      description: "Monitor metadata, data, or storage layers",
      icon: "📦",
      color: colors.purple
    }
  ]}
/>

#### Streaming Processing Modes

<ComparisonTable
  beforeTitle="Continuous Data Delivery"
  afterTitle="Irregular Data Delivery"
  beforeColor={colors.blue}
  afterColor={colors.purple}
  items={[
    {
      label: "Expectation",
      before: "At least one record per time unit (e.g., per minute)",
      after: "Acceptable gaps (e.g., 5 minutes without data)"
    },
    {
      label: "Detection Logic",
      before: "Alert when no data in specified time unit",
      after: "Alert when gap exceeds accepted duration"
    },
    {
      label: "Evaluation Period",
      before: "Specific time unit (1 minute)",
      after: "Multiple consecutive time points"
    },
    {
      label: "False Positives",
      before: "Low if threshold is correct",
      after: "Reduced by analyzing windows"
    }
  ]}
/>

<DiagramContainer title="Flow Interruption Detection: Continuous vs. Irregular">
  <Column gap="lg">
    <Group title="Continuous Data Delivery" color={colors.blue} direction="column">
      <Row gap="sm" align="center">
        <Box color={colors.green} size="sm">✓ 1m</Box>
        <Box color={colors.green} size="sm">✓ 1m</Box>
        <Box color={colors.red} size="sm">✗ 1m</Box>
        <Arrow direction="right" label="Alert!" />
      </Row>
    </Group>
    <Group title="Irregular Data Delivery" color={colors.purple} direction="column">
      <Row gap="sm" align="center">
        <Box color={colors.green} size="sm">✓</Box>
        <Box color={colors.green} size="sm">✓</Box>
        <Box color={colors.orange} size="sm">Gap 3m</Box>
        <Box color={colors.orange} size="sm">Gap 4m</Box>
        <Box color={colors.red} size="sm">Gap 6m</Box>
        <Arrow direction="right" label="Alert!" />
      </Row>
    </Group>
  </Column>
</DiagramContainer>

#### Batch Processing Modes

<StackDiagram
  title="Batch Flow Interruption Detection Layers"
  layers={[
    {
      label: "Metadata Layer (Fastest)",
      color: colors.green,
      items: [
        "Monitor creation/modification time",
        "Cheapest option - direct access",
        "Alert when modification time exceeds threshold"
      ]
    },
    {
      label: "Data Layer (Moderate)",
      color: colors.blue,
      items: [
        "Add modification time column",
        "Count rows in evaluation periods",
        "Compare consecutive counts",
        "Requires extra storage for statistics"
      ]
    },
    {
      label: "Storage Layer (Flexible)",
      color: colors.purple,
      items: [
        "Monitor last file write time",
        "Works with any file format",
        "Alert when no updates within threshold"
      ]
    }
  ]}
/>

> **Warning**
>
> **Metadata Traps:** Even if modification metadata exists, it may include schema evolution changes that don't add new records. Always verify that metadata changes correspond to actual data updates.

#### Consequences

<CardGrid
  columns={3}
  cards={[
    {
      title: "Threshold Challenge",
      icon: "⚖️",
      color: colors.orange,
      items: [
        "Finding the perfect threshold is difficult",
        "Volume-based thresholds can generate false positives",
        "Marketing campaigns may spike activity",
        "Requires historical data analysis"
      ]
    },
    {
      title: "Metadata Limitations",
      icon: "⚠️",
      color: colors.red,
      items: [
        "Metadata layer may not exist",
        "Modification time may be unavailable",
        "Schema changes count as modifications",
        "Can trigger false positives"
      ]
    },
    {
      title: "Storage False Positives",
      icon: "🔧",
      color: colors.slate,
      items: [
        "Housekeeping operations create files",
        "Compaction merges existing blocks",
        "Storage shows activity without new data",
        "Need to filter maintenance operations"
      ]
    }
  ]}
/>

#### Examples

**Example 1: Apache Kafka with Prometheus and Grafana**

Monitor incoming messages per minute using Prometheus expressions:

```promql
sum without(instance)(rate(
  kafka_server_brokertopicmetrics_messagesin_total{topic="visits"}[1m]
))
```

Configure Grafana alert: When the last 5 values equal zero, raise a data interruption alert.

**Example 2: PostgreSQL Batch Workload**

Track last commit timestamp using the `pg_xact_commit_timestamp` function (requires `track_commit_timestamp = on`):

```sql
SELECT
  CAST(EXTRACT(EPOCH FROM NOW()) AS INT) AS "time",
  CAST(EXTRACT(EPOCH FROM NOW() - MAX(pg_xact_commit_timestamp(xmin))) AS INT) AS value
FROM dedp.visits_flattened
```

Alert when the difference exceeds your accepted flow interruption threshold.

**Example 3: Delta Lake with Prometheus**

<CodeRunner
  language="python"
  title="Delta Lake Flow Interruption Tracking"
  code={`# Write data to Delta Lake
visits_to_write.write.format('delta').insertInto(get_valid_visits_table())

# Send last update time metric to Prometheus
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

registry = CollectorRegistry()
metrics_gauge = Gauge('visits_last_update_time',
                     'Update time for the visits Delta Lake table',
                     registry=registry)
metrics_gauge.set_to_current_time()
metrics_gauge.set(1)
push_to_gateway('localhost:9091',
                job='visits_table_ingestor',
                registry=registry)`}
/>

---

### 2.2. Pattern: Skew Detector

#### Problem

After implementing the Flow Interruption Detector, consumers complained again - this time about incomplete datasets. Your batch job processed correctly, but it operated on a half-empty dataset due to upstream data generation issues. You need a way to ensure you always process complete datasets.

#### Solution

The **Skew Detector** pattern provides control over data volume variations. Data skew occurs when a pipeline processes significantly different data volumes in consecutive executions or when some partitions have more load than others.

<ProcessFlow
  direction="horizontal"
  steps={[
    {
      title: "Step 1: Identify Comparison Window",
      description: "Which time periods to compare (e.g., today vs. yesterday)",
      icon: "📅",
      color: colors.blue
    },
    {
      title: "Step 2: Set Tolerance Threshold",
      description: "Acceptable data volume difference (e.g., ±50%)",
      icon: "⚖️",
      color: colors.purple
    },
    {
      title: "Step 3: Implement Calculation",
      description: "Window-to-window or standard deviation ratio",
      icon: "🧮",
      color: colors.green
    }
  ]}
/>

#### Calculation Approaches

<DiagramContainer title="Skew Detection Methods">
  <Column gap="lg">
    <Group title="Window-to-Window Comparison" color={colors.blue} direction="column">
      <Box color={colors.blue} variant="filled">
        Compare consecutive execution volumes
      </Box>
      <Row gap="md" align="center">
        <Box color={colors.green} size="sm">Day 1: 100k</Box>
        <Arrow direction="right" />
        <Box color={colors.orange} size="sm">Day 2: 50k</Box>
        <Arrow direction="right" label="50% drop" />
        <Box color={colors.red} size="sm">Alert!</Box>
      </Row>
    </Group>
    <Group title="Standard Deviation Ratio" color={colors.purple} direction="column">
      <Box color={colors.purple} variant="filled">
        STDDEV(x) / AVG(x) - measures deviation from mean
      </Box>
      <Row gap="md" align="center">
        <Box color={colors.blue} size="sm">P1: 100k</Box>
        <Box color={colors.blue} size="sm">P2: 95k</Box>
        <Box color={colors.red} size="sm">P3: 20k</Box>
        <Arrow direction="right" label="High ratio" />
        <Box color={colors.red} size="sm">Alert!</Box>
      </Row>
    </Group>
  </Column>
</DiagramContainer>

> **Insight**
>
> Use the Skew Detector as the first Audit stage in the AWAP (Audit-Write-Audit-Publish) pattern from Chapter 9. It acts as a guard preventing the processing of partial datasets.

#### Consequences

<CardGrid
  columns={3}
  cards={[
    {
      title: "Seasonality Challenge",
      icon: "🌊",
      color: colors.orange,
      items: [
        "Marketing campaigns spike data",
        "Summer vs. winter variations",
        "Business cycles affect volume",
        "Requires business knowledge to set rules",
        "May need period-specific exceptions"
      ]
    },
    {
      title: "Communication Needs",
      icon: "💬",
      color: colors.blue,
      items: [
        "Coordinate with marketing teams",
        "Adapt alerts for campaigns",
        "Identify false positives proactively",
        "Requires cross-department sync",
        "More communication than technical work"
      ]
    },
    {
      title: "Fatality Loop Risk",
      icon: "🔄",
      color: colors.red,
      items: [
        "Failed day becomes comparison baseline",
        "Valid data appears skewed next day",
        "Fix: Compare to last successful run",
        "Ask producers to resolve issues quickly",
        "Avoid day-to-day comparison after failures"
      ]
    }
  ]}
/>

> **Warning**
>
> **Fatality Loop Example:** Day 1 has 300k records (valid). Day 2 has 100k records (skewed, fails validation). Day 3 has 290k records (valid volume, but 3x larger than Day 2, so it fails validation). Always compare to the last successful run, not just the previous day.

#### Examples

**Example 1: PostgreSQL Partitioned Tables**

Calculate standard deviation ratio using metadata:

```sql
SELECT
  NOW() AS "time",
  (STDDEV(n_live_tup) / AVG(n_live_tup)) * 100 AS value
FROM pg_catalog.pg_stat_user_tables
WHERE relname != 'visits_all_range'
  AND relname LIKE 'visits_all_range_%';
```

When the ratio exceeds your threshold, you have storage data skew.

**Example 2: Apache Kafka with Prometheus**

Calculate partition skew:

```promql
stddev(sum(kafka_log_size{topic='visits'}) by (partition)) /
  avg(kafka_log_size{topic='visits'}) * 100
```

**Example 3: Apache Airflow Window-to-Window Comparison**

<CodeRunner
  language="python"
  title="Data Skew Detection in Airflow Pipeline"
  code={`# Sensor waits for next partition
next_partition_sensor = FileSensor(...)

def compare_volumes():
    context = get_current_context()
    previous_dag_run = DagRun.get_previous_dagrun(context['dag_run'])

    if previous_dag_run:
        previous_execution_date = previous_dag_run.execution_date

        # Get current and previous file sizes
        current_file_path = get_full_path(context['logical_date'], 'json')
        current_file_size = os.path.getsize(current_file_path)

        previous_file_path = get_full_path(previous_execution_date, 'json')
        previous_file_size = os.path.getsize(previous_file_path)

        # Calculate size ratio
        size_ratio = current_file_size / previous_file_size

        # Alert if more than 50% different
        if size_ratio > 1.5 or size_ratio < 0.5:
            raise Exception(f'Unexpected file size detected: ratio={size_ratio}')

volume_comparator = PythonOperator(
    task_id='compare_volumes',
    python_callable=compare_volumes
)

transform_file = PythonOperator(...)
load_to_table = PostgresOperator(...)

# Pipeline flow with skew detection
(next_partition_sensor >> volume_comparator >>
 transform_file >> load_to_table)`}
/>

---

## 3. Time Detectors

**In plain English:** Time detectors are like stopwatches for your data pipelines - they measure how long things take and alert you when processes fall behind or miss deadlines.

**In technical terms:** Time detectors monitor latency metrics in data processing systems, helping identify performance degradation and SLA violations.

**Why it matters:** Even with perfect data quality and availability, slow processing can break downstream dependencies and SLAs. Time detectors help you spot and address latency issues before they impact consumers.

---

### 3.1. Pattern: Lag Detector

#### Problem

One of your streaming jobs suddenly processed 30% more data than usual. You missed the email announcing this increase, and now downstream consumers complain about slower data delivery. You've promised this is the last time - you need a scaling strategy, but first you must monitor how fast your consumer processes input data.

#### Solution

The **Lag Detector** pattern measures how far a data consumer falls behind the data producer, serving as an early indicator for data quality problems like data freshness and unavailability.

<ProcessFlow
  direction="horizontal"
  steps={[
    {
      title: "Define Lag Unit",
      description: "Record position, append time, commit number, or partition timestamp",
      icon: "📏",
      color: colors.blue
    },
    {
      title: "Compare Units",
      description: "Last processed vs. most recent available",
      icon: "⚖️",
      color: colors.purple
    },
    {
      title: "Aggregate Results",
      description: "MAX, percentile, or both for partitioned stores",
      icon: "📊",
      color: colors.green
    }
  ]}
/>

#### Lag Calculation Algorithm

<CodeRunner
  language="python"
  title="High-Level Lag Calculation"
  code={`# Basic lag equation
last_available_unit = get_last_available_unit()
last_processed_unit = get_last_processed_unit()

lag = last_available_unit - last_processed_unit

# For partitioned data stores
partition_lags = [
    get_lag(partition) for partition in partitions
]

# Strategy options:
worst_case_lag = max(partition_lags)  # Detect worst scenario
overall_lag = percentile(partition_lags, 90)  # P90: 90% within this lag
combined_view = (worst_case_lag, overall_lag)  # Both approaches`}
/>

#### Partitioned Data Strategies

<ComparisonTable
  beforeTitle="MAX Aggregation"
  afterTitle="Percentile (P90/P95)"
  beforeColor={colors.red}
  afterColor={colors.blue}
  items={[
    {
      label: "Purpose",
      before: "Detect worst-case scenario",
      after: "Understand overall performance"
    },
    {
      label: "Sensitivity",
      before: "One slow partition triggers alert",
      after: "Shows how most partitions perform"
    },
    {
      label: "Use Case",
      before: "Critical SLA monitoring",
      after: "General health monitoring"
    },
    {
      label: "Interpretation",
      before: "At least one partition has this lag",
      after: "90-95% of partitions within this lag"
    }
  ]}
/>

> **Warning**
>
> **The Average Trap:** Averaging hides critical information. Example: 7 partitions with lags of 10, 5, 30, 2, 3, 5, and 3 seconds have an average of 8 seconds but a P90 of 18 seconds. The average wrongly suggests good performance, while P90 reveals the truth: 90% of data is processed within 18 seconds. Always prefer percentiles for observability.

<DiagramContainer title="Lag Detection: Kafka Example">
  <Column gap="md">
    <Row gap="md" align="center">
      <Box color={colors.blue} size="lg">Producer<br/>Offset: 1000</Box>
      <Arrow direction="right" />
      <Box color={colors.purple} size="lg">Consumer<br/>Offset: 850</Box>
    </Row>
    <Box color={colors.orange} variant="filled">
      Lag = 1000 - 850 = 150 records
    </Box>
  </Column>
</DiagramContainer>

#### Consequences

**Data Skew Impact**

If you use MAX aggregation to represent lag, be cautious: poor results may not indicate consumer problems. If one partition receives more load than others (data skew), your consumer will naturally process it slower. The issue isn't the consumer - it's unbalanced data distribution during the writing step.

> **Insight**
>
> When MAX lag consistently shows one partition lagging, investigate the data distribution strategy. Better partitioning can often solve lag problems more effectively than scaling the consumer.

#### Examples

**Example 1: Apache Spark Structured Streaming with Kafka**

<CodeRunner
  language="python"
  title="Spark Streaming Lag Detection Listener"
  code={`class BatchCompletionSlaListener(StreamingQueryListener):

    def onQueryProgress(self, event: "QueryProgressEvent") -> None:
        # Get latest available offsets from Kafka
        latest_offsets_per_partition = self._read_last_available_offsets()

        # Get processed offsets from this microbatch
        visits_end_offsets = json.loads(event.progress.sources[0].endOffset)
        visits_offsets_per_partition: Dict[str,int] = visits_end_offsets['visits']

        # Calculate lag per partition and send to Prometheus
        registry = CollectorRegistry()
        metrics_gauge = Gauge('visits_reader_lag',
                             'Lag per partition',
                             registry=registry,
                             labelnames=['partition'])

        for partition, value in visits_offsets_per_partition.items():
            lag = latest_offsets_per_partition[partition] - value
            metrics_gauge.labels(partition=partition).set(lag)

        push_to_gateway('localhost:9091',
                       job='visits_reader',
                       registry=registry)`}
/>

**Example 2: Delta Lake with availableNow Trigger**

<CodeRunner
  language="python"
  title="Delta Lake Lag Detection"
  code={`# Consumer: Structured Streaming with scheduled batch processing
visits_stream = spark_session.readStream.table('default.visits')

# Process all available data then stop (scheduled execution)
query = (visits_stream.writeStream
         .trigger(availableNow=True)
         .option('checkpointLocation', checkpoint_dir)
         .option('truncate', False)
         .format('console')
         .start())

query.awaitTermination()

# Extract and report last processed version
last_version = query.lastProgress["sources"][0]["endOffset"]["reservoirVersion"]

registry = CollectorRegistry()
metrics_gauge = Gauge('visits_reader_version',
                     'Last read version of the visits table',
                     registry=registry)
metrics_gauge.set(last_version)
push_to_gateway('localhost:9091',
                job='visits_reader_version',
                registry=registry)

# Producer: Report last written version
# After data generation and commit
last_written_version = (spark_session
                       .sql('DESCRIBE HISTORY default.visits')
                       .selectExpr('MAX(version) AS last_version')
                       .collect()[0].last_version)

# Configure alert: (last_written_version - last_version) > threshold`}
/>

---

### 3.2. Pattern: SLA Misses Detector

#### Problem

Your batch job is scheduled at 6:00 a.m. and must complete within 40 minutes. Downstream consumers are critical data pipelines that must generate business statistics before 8:00 a.m. You've optimized the job to respect the 40-minute SLA, but unpredictable things happen. You need an observability mechanism to notify you and consumers whenever the job takes longer than 40 minutes.

#### Solution

The **SLA Misses Detector** pattern measures processing time and compares it to maximum allowed execution time, ensuring consumers are notified about latency problems.

<DiagramContainer title="SLA Detection by Processing Mode">
  <Column gap="lg">
    <Group title="Batch Job (Simple)" color={colors.blue} direction="column">
      <Row gap="sm" align="center">
        <Box color={colors.green} size="sm">Start Time</Box>
        <Arrow direction="right" />
        <Box color={colors.blue} size="sm">End Time</Box>
        <Arrow direction="right" />
        <Box color={colors.orange} size="sm">Duration</Box>
      </Row>
      <Box color={colors.slate} variant="subtle">
        If (End Time - Start Time) &gt; SLA Threshold → Alert
      </Box>
    </Group>
    <Group title="Streaming Job (Complex)" color={colors.purple} direction="column">
      <Column gap="sm">
        <Box color={colors.purple} variant="filled">
          Microbatch/Windowed Mode
        </Box>
        <Box color={colors.slate} variant="subtle">
          Measure per-batch: End Time - Start Time
        </Box>
        <Box color={colors.purple} variant="filled">
          Continuous Mode (No Windows)
        </Box>
        <Box color={colors.slate} variant="subtle">
          Per-record: Write Time - Read Time → Aggregate with MAX or percentile
        </Box>
      </Column>
    </Group>
  </Column>
</DiagramContainer>

#### SLA vs. Lag: Complementary but Different

> **Insight**
>
> SLA Misses Detector and Lag Detector are complementary but not interchangeable. A job can respect its SLA while lag increases (throughput-limited processing of skewed partition), or have zero lag but miss SLA (slow processing of daily batch).

<ComparisonTable
  beforeTitle="SLA Misses"
  afterTitle="Lag"
  beforeColor={colors.orange}
  afterColor={colors.blue}
  items={[
    {
      label: "Measures",
      before: "How long processing takes",
      after: "How far behind consumer is"
    },
    {
      label: "Batch Job Relevance",
      before: "Critical: must finish on time",
      after: "Low: scheduled processing has no lag at start"
    },
    {
      label: "Streaming Relevance",
      before: "Per-batch or per-record timing",
      after: "Consumer position vs. producer position"
    },
    {
      label: "Example Scenario",
      before: "Daily job takes 2 hours instead of 40 minutes",
      after: "Consumer is 1000 records behind producer"
    }
  ]}
/>

#### Consequences

**Late Data and Event Time**

Processing time is the simplest SLA measure, but you can also use event time for end-to-end timing between data generation and processing. However, event time introduces late data complexity.

<DiagramContainer title="Processing Time vs. Event Time SLAs">
  <Column gap="md">
    <Group title="Processing Time SLA" color={colors.blue} direction="row">
      <Box color={colors.green} size="sm">Read Time</Box>
      <Arrow direction="right" label="Process" />
      <Box color={colors.blue} size="sm">Write Time</Box>
      <Arrow direction="right" />
      <Box color={colors.orange} size="sm">Duration</Box>
    </Group>
    <Group title="Event Time SLA" color={colors.purple} direction="row">
      <Box color={colors.green} size="sm">Generation Time</Box>
      <Arrow direction="right" label="Network + Process" />
      <Box color={colors.purple} size="sm">Write Time</Box>
      <Arrow direction="right" />
      <Box color={colors.orange} size="sm">End-to-End</Box>
    </Group>
  </Column>
</DiagramContainer>

> **Warning**
>
> **Late Data Problem:** If a producer loses network connectivity and delivers buffered data minutes later, your event time-based SLA may fail due to delivery interruption, not processing issues. Processing time SLA won't break because it measures current time, not event time. Separate these concerns: monitor both independently to identify whether delays are from network/producers or your processing.

#### Examples

**Example 1: Apache Airflow SLA**

<CodeRunner
  language="python"
  title="Airflow Task-Level SLA"
  code={`@task(sla=datetime.timedelta(seconds=10))
def processing_task_2():
    # Task logic here
    pass

# Note: Apache Airflow 2.10.2 computes SLA from pipeline execution start,
# not task start. If processing_task_2 starts after 08:00:10 for an
# 08:00:00 scheduled run, it's already considered late.
# This behavior is planned for refactoring in Airflow 3.1 (AIP-57)`}
/>

**Example 2: Apache Flink Processing Time SLA**

<CodeRunner
  language="python"
  title="Flink: Add Processing Time to Records"
  code={`# Job 1: Data processor - adds start processing time
def map_json_to_reduced_visit(json_payload: str) -> str:
    # Transform logic...
    return json.dumps(ReducedVisitWrapper(
        start_processing_time_unix_ms=time.time_ns() // 1_000_000,
        # other fields...
    ).to_dict())`}
/>

<CodeRunner
  language="python"
  title="Flink: Calculate SLA Metrics"
  code={`# Job 2: SLA monitor - reads processing time and append time
CREATE TEMPORARY TABLE reduced_visits (
    \`start_processing_time_ms\` BIGINT,
    \`append_time\` TIMESTAMP METADATA FROM 'timestamp' VIRTUAL
) WITH ('connector' = 'kafka', ...)

# Calculate time difference (SLA)
sla_query: Table = table_environment.sql_query("""
SELECT
    append_time,
    ((1000 * UNIX_TIMESTAMP(CAST(append_time AS STRING)) +
      EXTRACT(MILLISECOND FROM append_time)) -
     start_processing_time_ms) AS time_difference,
    FLOOR(append_time TO MINUTE) AS visit_time_minute
FROM reduced_visits
""")

# Aggregate to percentiles per minute window
sla_query_datastream
    .key_by(extract_grouping_key)
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(
        aggregate_function=PercentilesAggregateFunction(),
        window_function=PercentilesOutputWindowFormatter()
    )
# Send to monitoring stack for alerting`}
/>

---

## 4. Data Lineage

**In plain English:** Data lineage is like a family tree for your data - it shows where data comes from, how it's transformed, and where it goes, helping you understand dependencies and troubleshoot issues.

**In technical terms:** Data lineage patterns create dependency graphs at dataset and column levels, mapping the complete journey of data through transformation pipelines across teams and systems.

**Why it matters:** When detected issues aren't your fault (like late events or schema inconsistencies from upstream), you need to know who to ask for help. Data lineage provides this organizational and technical understanding.

---

### 4.1. Pattern: Dataset Tracker

#### Problem

You're consuming a dataset with poor quality. Your batch job regularly fails because the schema is inconsistent - one field has had different data types over time. Your upstream data provider isn't aware of these changes because they don't generate the dataset; they process data from another team. You need to understand the dataset dependency chain to detect which team introduces the type inconsistency issue.

#### Solution

The **Dataset Tracker** pattern creates a family tree of datasets within your organization, making it easy to discover dependencies between datasets and teams.

<TreeDiagram
  root={{
    label: "orders (Team A)",
    color: colors.blue,
    children: [
      {
        label: "orders_with_users (Team B)",
        color: colors.purple,
        children: [
          {
            label: "orders_kafka_topic (Team B)",
            color: colors.purple
          }
        ]
      },
      {
        label: "users (Team C)",
        color: colors.green
      }
    ]
  }}
/>

#### Implementation Approaches

<ComparisonTable
  beforeTitle="Fully Managed (Automatic)"
  afterTitle="Manual Implementation"
  beforeColor={colors.green}
  afterColor={colors.blue}
  items={[
    {
      label: "Setup Effort",
      before: "Zero - automatic detection",
      after: "High - requires configuration"
    },
    {
      label: "Scope",
      before: "Limited to specific services",
      after: "Flexible - any data store"
    },
    {
      label: "Examples",
      before: "Databricks Unity Catalog, GCP Dataplex",
      after: "OpenLineage with custom extractors"
    },
    {
      label: "Vendor Lock",
      before: "High - cloud-specific",
      after: "Low - open standards"
    }
  ]}
/>

#### Manual Implementation Flow

<ProcessFlow
  direction="vertical"
  steps={[
    {
      title: "Extract Dependencies",
      description: "Identify inputs/outputs at orchestration or database layer",
      icon: "🔍",
      color: colors.blue
    },
    {
      title: "Send to Lineage Service",
      description: "Report relationships to centralized tracking system",
      icon: "📤",
      color: colors.purple
    },
    {
      title: "Build Dependency Graph",
      description: "Service interprets and stores relationships",
      icon: "🗺️",
      color: colors.orange
    },
    {
      title: "Visualize Lineage",
      description: "UI displays interactive dependency tree",
      icon: "📊",
      color: colors.green
    }
  ]}
/>

#### Extraction Layers

<CardGrid
  columns={2}
  cards={[
    {
      title: "Data Orchestration Layer",
      icon: "⚙️",
      color: colors.blue,
      items: [
        "Each pipeline declares inputs/outputs",
        "Report to external lineage service",
        "Some tools auto-detect (e.g., Airflow + OpenLineage)",
        "Example: Airflow operators"
      ]
    },
    {
      title: "Database Layer",
      icon: "🗄️",
      color: colors.purple,
      items: [
        "Analyze executed queries",
        "Parse SQL to extract table references",
        "Build dependency tree from JOIN/FROM clauses",
        "Example: SELECT ... FROM orders o JOIN users u"
      ]
    }
  ]}
/>

> **Insight**
>
> Dataset tracking is a cornerstone of data mesh architecture, where domain teams own their datasets. In large organizations, understanding cross-team dependencies becomes critical for both operations and governance.

#### Consequences

<CardGrid
  columns={2}
  cards={[
    {
      title: "Vendor Lock Concerns",
      icon: "🔒",
      color: colors.red,
      items: [
        "Fully managed solutions are cloud-specific",
        "Limited to services within same cloud",
        "Partial view with external data stores",
        "Open source alternatives provide flexibility"
      ]
    },
    {
      title: "Custom Work Required",
      icon: "🔧",
      color: colors.orange,
      items: [
        "Built-in tasks auto-detected",
        "Custom tasks need manual input/output declaration",
        "Extra coding for non-standard workflows",
        "Balance convenience vs. flexibility"
      ]
    }
  ]}
/>

#### Examples

**OpenLineage with Apache Airflow**

Setup requires minimal configuration:

```bash
# Set environment variable
export OPENLINEAGE_URL=http://localhost:5000

# Install provider package
pip install apache-airflow-providers-openlineage
```

Native support for operators like `PostgresOperator` means automatic lineage extraction:

<CodeRunner
  language="python"
  title="Airflow DAG with Automatic Lineage"
  code={`# No extra code needed - OpenLineage extractors handle it
load_data = PostgresOperator(
    task_id='load_visits',
    postgres_conn_id='postgres_default',
    sql="""
        INSERT INTO final_visits
        SELECT * FROM staging_visits
        WHERE quality_score > 0.8
    """
)

# OpenLineage automatically detects:
# - Input: staging_visits table
# - Output: final_visits table
# - Transformation: quality filter
# View lineage in Marquez UI`}
/>

**OpenLineage with Apache Spark**

<CodeRunner
  language="python"
  title="Spark with OpenLineage Configuration"
  code={`def create_spark_session_with_open_lineage(app_name: str) -> SparkSession:
    return (SparkSession.builder
            .master('local[*]')
            .appName(app_name)
            # Enable OpenLineage listener
            .config('spark.extraListeners',
                   'io.openlineage.spark.agent.OpenLineageSparkListener')
            # Configure OpenLineage transport
            .config('spark.openlineage.transport.type', 'http')
            .config('spark.openlineage.transport.url', 'http://localhost:5000')
            .config('spark.openlineage.namespace', 'visits')
            # Add OpenLineage dependency
            .config('spark.jars.packages',
                   'io.openlineage:openlineage-spark_2.12:1.21.1')
            .getOrCreate())

# All Spark SQL operations now automatically tracked
spark = create_spark_session_with_open_lineage('visits_processor')
spark.sql("""
    CREATE TABLE enriched_visits AS
    SELECT v.*, u.user_name
    FROM visits v
    JOIN users u ON u.id = v.user_id
""")
# Lineage: visits + users -> enriched_visits`}
/>

---

### 4.2. Pattern: Fine-Grained Tracker

#### Problem

You implemented the Denormalizer pattern to avoid costly joins. The table has grown to over 30 columns in three years. Your team composition changes frequently, and new members always ask about table dependencies. While the Dataset Tracker answers most questions, one remains unresolved: which columns from upstream tables compose each column in your denormalized table?

#### Solution

The **Fine-Grained Tracker** pattern provides column-level and row-level tracking details about data origin.

<StackDiagram
  title="Tracking Granularity Levels"
  layers={[
    {
      label: "Dataset Level (Coarse)",
      color: colors.blue,
      items: [
        "Table/topic dependencies",
        "Answered by Dataset Tracker",
        "Team-level ownership"
      ]
    },
    {
      label: "Column Level (Fine)",
      color: colors.purple,
      items: [
        "Which input columns create each output column",
        "Transformation logic tracking",
        "Native support in some tools"
      ]
    },
    {
      label: "Row Level (Finest)",
      color: colors.green,
      items: [
        "Which job produced each row",
        "Debugging-focused",
        "Requires manual decoration"
      ]
    }
  ]}
/>

#### Column-Level Tracking

**Native Support:**
- Databricks Unity Catalog: `system.access.column_lineage` table
- Azure Purview: Built-in column tracking
- OpenLineage: Automatic for Apache Spark SQL

**Manual Implementation:**
Analyze query execution plans to track dependencies:

<DiagramContainer title="Column Lineage Example">
  <Column gap="md">
    <Box color={colors.blue} variant="filled">
      SQL: SELECT CONCAT(u.first_name, d.delivery_address) AS user_with_address<br/>
      FROM users u JOIN addresses d ON d.user_id = u.id
    </Box>
    <Arrow direction="down" label="Execution Plan Analysis" />
    <Row gap="md" align="center">
      <Box color={colors.green} size="sm">users.first_name</Box>
      <Box color={colors.green} size="sm">addresses.delivery_address</Box>
    </Row>
    <Arrow direction="down" label="Compose" />
    <Box color={colors.purple}>output.user_with_address</Box>
  </Column>
</DiagramContainer>

#### Row-Level Tracking

Add metadata to identify which job produced each row using data decoration patterns:

<DiagramContainer title="Row-Level Lineage Architecture">
  <Row gap="md">
    <Box color={colors.blue}>Job Metadata<br/>(name, version, batch)</Box>
    <Arrow direction="right" label="Decorate" />
    <Box color={colors.purple}>Data Record<br/>+ Headers/Columns</Box>
    <Arrow direction="right" label="Write" />
    <Box color={colors.green}>Storage<br/>(Kafka, Database)</Box>
  </Row>
</DiagramContainer>

> **Insight**
>
> Row-level lineage is invaluable for debugging. When data quality issues occur, you can quickly identify which job version and batch produced problematic rows, enabling faster root cause analysis and producer communication.

#### Consequences

<CardGrid
  columns={3}
  cards={[
    {
      title: "Custom Code Opacity",
      icon: "⚫",
      color: colors.red,
      items: [
        "Native SQL functions tracked easily",
        "Custom mapping functions are opaque boxes",
        "Lineage sees output but not logic",
        "Limited capacity to interpret code"
      ]
    },
    {
      title: "Row-Level Visualization Gaps",
      icon: "📊",
      color: colors.orange,
      items: [
        "Dataset/column lineage widely supported",
        "Row-level lineage lacks standard tools",
        "Need separate query layer",
        "Useful for debugging, not visualization"
      ]
    },
    {
      title: "Evolution Management",
      icon: "🔄",
      color: colors.blue,
      items: [
        "Transformations change over time",
        "Must track historical lineage",
        "Ensure solution supports evolution",
        "Incorrect view after upstream changes"
      ]
    }
  ]}
/>

> **Warning**
>
> **Custom Code Challenge:** If you transform data with `df.map(custom_function)`, lineage frameworks can't see inside `custom_function`. They only know input and output datasets/columns. For complex transformations, consider using SQL expressions or documenting custom logic separately.

#### Examples

**Column-Level with Apache Spark and OpenLineage**

Uses the same `SparkSession` configuration as Dataset Tracker. Column lineage is automatically captured for SQL operations:

```sql
-- Automatically tracked at column level
CREATE TABLE user_summary AS
SELECT
    u.user_id,                                    -- Lineage: users.user_id
    u.email,                                      -- Lineage: users.email
    COUNT(o.order_id) as total_orders,            -- Lineage: orders.order_id
    SUM(o.amount) as total_spent                  -- Lineage: orders.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.user_id
GROUP BY u.user_id, u.email
```

**Row-Level with Kafka Headers**

<CodeRunner
  language="python"
  title="Row-Level Lineage with Kafka Headers"
  code={`# Job 1: visits_decorator_job
# Decorate records with lineage metadata
visits_to_save.withColumn('headers', F.array(
    F.struct(
        F.lit('job_version').alias('key'),
        F.lit(job_version).alias('value')
    ),
    F.struct(
        F.lit('job_name').alias('key'),
        F.lit(job_name).alias('value')
    ),
    F.struct(
        F.lit('batch_version').alias('key'),
        F.lit(str(batch_number).encode('UTF-8')).alias('value')
    )
))

# Job 2: visits_reducer_job
# Inherit parent lineage and add own metadata
visits_to_save.withColumn('headers', F.array(
    # Same metadata as Job 1
    F.struct(
        F.lit('job_version').alias('key'),
        F.lit(job_version).alias('value')
    ),
    F.struct(
        F.lit('job_name').alias('key'),
        F.lit(job_name).alias('value')
    ),
    F.struct(
        F.lit('batch_version').alias('key'),
        F.lit(str(batch_number).encode('UTF-8')).alias('value')
    ),
    # PLUS parent lineage for full chain
    F.struct(
        F.lit('parent_lineage').alias('key'),
        F.to_json(F.col('headers')).cast('binary').alias('value')
    )
))

# Result: Each record carries complete lineage chain
# Can query: "Which job version produced this bad record?"
# Answer: Check headers -> job_name=visits_decorator_job, version=1.2.3`}
/>

---

## 5. Summary

This chapter equipped you with comprehensive data observability patterns to complement your data quality solutions from Chapter 9.

### Key Takeaways

**Data Detectors**
- **Flow Interruption Detector** spots data unavailability in both streaming (continuous/irregular) and batch (metadata/data/storage layers) scenarios, ensuring you catch silent failures before consumers complain
- **Skew Detector** identifies unbalanced datasets through window-to-window comparison or standard deviation ratio, protecting against incomplete data processing while requiring careful threshold tuning for seasonality

**Time Detectors**
- **Lag Detector** measures how far consumers fall behind producers using partition-level metrics aggregated via MAX or percentiles (prefer P90/P95 over averages), providing early warning for performance issues
- **SLA Misses Detector** ensures processing completes within time limits by tracking batch job duration or streaming per-record/per-batch timing, complementing lag detection with different perspectives on performance

**Data Lineage**
- **Dataset Tracker** creates dependency trees among tables, topics, and queues across teams, enabling quick identification of data quality issue sources through both fully managed (cloud) and manual (OpenLineage) approaches
- **Fine-Grained Tracker** provides column-level transformation tracking and row-level job attribution, invaluable for debugging but limited by custom code opacity and visualization tool gaps

### The Complete Picture

<DiagramContainer title="Data Observability: Detection + Tracking">
  <Row gap="lg">
    <Column gap="md">
      <Box color={colors.blue} variant="filled" size="lg">Detection</Box>
      <Box color={colors.blue} size="sm">Flow Interruption</Box>
      <Box color={colors.blue} size="sm">Skew Detection</Box>
      <Box color={colors.blue} size="sm">Lag Monitoring</Box>
      <Box color={colors.blue} size="sm">SLA Tracking</Box>
    </Column>
    <Arrow direction="right" label="Complete Observability" />
    <Column gap="md">
      <Box color={colors.purple} variant="filled" size="lg">Tracking</Box>
      <Box color={colors.purple} size="sm">Dataset Lineage</Box>
      <Box color={colors.purple} size="sm">Column Lineage</Box>
      <Box color={colors.purple} size="sm">Row Attribution</Box>
      <Box color={colors.purple} size="sm">Team Dependencies</Box>
    </Column>
  </Row>
</DiagramContainer>

> **Insight**
>
> Data observability is not optional - it's the difference between reactive firefighting (responding to consumer complaints) and proactive management (detecting issues before they impact users). Combined with data quality patterns from Chapter 9, observability patterns provide end-to-end control of your data engineering stack.

### Implementation Priorities

1. **Start with Flow Interruption Detection** - catches the most critical failures
2. **Add Skew Detection to AWAP pattern** - prevents processing incomplete datasets
3. **Implement Lag Monitoring for streaming jobs** - provides early performance warnings
4. **Configure SLA tracking for critical pipelines** - ensures business requirements are met
5. **Deploy Dataset Tracker** - understand cross-team dependencies
6. **Add Fine-Grained Tracking** - enable detailed debugging when needed

This is the final chapter of the book. These patterns, combined with everything you've learned, provide a comprehensive toolkit for building robust, observable, and high-quality data engineering systems.

---

**Previous:** [Chapter 9: Data Quality Design Patterns](./chapter9) | **Next:** None (This is the last chapter)