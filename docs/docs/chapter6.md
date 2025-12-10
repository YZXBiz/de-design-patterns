---
sidebar_position: 6
title: "Chapter 6: Data Flow Design Patterns"
description: "Learn how to design and coordinate data pipelines with sequence, fan-in, fan-out, and orchestration patterns for efficient data engineering workflows"
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';

# Chapter 6: Data Flow Design Patterns

> **"The goal of data flow design patterns is to design and coordinate all steps required to generate a dataset. This involves actions like chaining various tasks in a pipeline, creating parallel or exclusive execution branches, or even managing the dependency of physically separated pipelines."**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Sequence Patterns](#2-sequence-patterns)
   - 2.1. [Local Sequencer](#21-local-sequencer)
   - 2.2. [Isolated Sequencer](#22-isolated-sequencer)
3. [Fan-In Patterns](#3-fan-in-patterns)
   - 3.1. [Aligned Fan-In](#31-aligned-fan-in)
   - 3.2. [Unaligned Fan-In](#32-unaligned-fan-in)
4. [Fan-Out Patterns](#4-fan-out-patterns)
   - 4.1. [Parallel Split](#41-parallel-split)
   - 4.2. [Exclusive Choice](#42-exclusive-choice)
5. [Orchestration Patterns](#5-orchestration-patterns)
   - 5.1. [Single Runner](#51-single-runner)
   - 5.2. [Concurrent Runner](#52-concurrent-runner)
6. [Summary](#6-summary)

---

## 1. Introduction

**In plain English:** Data flow patterns are like blueprints for organizing how data moves through your pipelines. Just as a factory has assembly lines with specific steps, data pipelines need structured ways to chain tasks, split work, and merge results.

**In technical terms:** Data flow design patterns provide reusable solutions for coordinating task dependencies, managing parallel execution branches, and controlling pipeline concurrency at both the orchestration and processing layers.

**Why it matters:** Properly designed data flows enable cross-team collaboration, improve pipeline maintainability, reduce debugging time, and optimize infrastructure usage. Without these patterns, pipelines become tangled, hard to restart selectively, and difficult to scale.

### 1.1. Understanding Data Flow Levels

Data flow design patterns operate at two different levels:

**Data Orchestration Layer:** Coordinates tasks within one or many data pipelines. This level is particularly useful for addressing cross-team collaboration issues and managing dependencies between physically separated workflows.

**Data Processing Layer:** Organizes business logic within individual jobs. Patterns at this level help structure transformations to make code more obvious and easier to maintain over time.

<DiagramContainer title="Data Flow Pattern Categories">
  <Row gap="lg">
    <Column gap="md">
      <Box color={colors.blue} variant="filled" size="lg" icon="🔗">
        Sequence
      </Box>
      <Box color={colors.slate} variant="subtle" size="sm">
        Coordinate tasks in order
      </Box>
    </Column>
    <Column gap="md">
      <Box color={colors.purple} variant="filled" size="lg" icon="🔽">
        Fan-In
      </Box>
      <Box color={colors.slate} variant="subtle" size="sm">
        Merge multiple branches
      </Box>
    </Column>
    <Column gap="md">
      <Box color={colors.orange} variant="filled" size="lg" icon="🔼">
        Fan-Out
      </Box>
      <Box color={colors.slate} variant="subtle" size="sm">
        Create parallel branches
      </Box>
    </Column>
    <Column gap="md">
      <Box color={colors.green} variant="filled" size="lg" icon="⚡">
        Orchestration
      </Box>
      <Box color={colors.slate} variant="subtle" size="sm">
        Manage concurrency
      </Box>
    </Column>
  </Row>
</DiagramContainer>

---

## 2. Sequence Patterns

The first category of patterns addresses the sequence of steps in data flows. This factor impacts pipeline complexity, performance, and maintenance. Sequence patterns help you avoid situations where restarting a failed task requires reprocessing all preceding steps.

### 2.1. Local Sequencer

The Local Sequencer orchestrates tasks locally, meaning within the same pipeline or data processing job.

#### Quick Reference

| | |
|---|---|
| **What it is** | A design pattern that orchestrates tasks locally (i.e., within the same pipeline or data processing job) |
| **When to use** | ✓ Complex job needs simplification ✓ Code has grown to hundreds of lines ✓ Job fails often and must restart from beginning |
| **Core problem** | Defining boundaries incorrectly can cause execution time to grow too much or impact other pipelines |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Data orchestration layer sequencing | Tasks need independent restart capability, require paid API calls, or leverage orchestrator abstractions |
| Data processing layer sequencing | Operations must execute as single transaction or depend on each other atomically |

> 📁 **Full code**: [chapter-06/01-sequence](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/01-sequence)

---

#### Problem

You're in charge of one of the oldest jobs in your data analytics department. Over the years, the codebase has grown from dozens to hundreds of lines, and the number of transformations has increased three times. The job fails frequently, and each time it must start again from the beginning, leading to long debugging journeys.

You've been tasked with simplifying the code and improving daily maintenance, but you can't remove any business logic.

#### Solution

**In plain English:** Break down a complex job into smaller, connected pieces that run one after another. It's like breaking a long assembly line into stations—if one station fails, you only need to restart from that point, not the entire line.

**In technical terms:** Decompose a monolithic data processing component into multiple smaller tasks with explicit dependencies based on dataset relationships. If task B requires data from task A, configure B to execute only after A completes successfully.

**Why it matters:** Separation improves code readability, enables selective restart capabilities, and reduces computational waste by avoiding reprocessing of successful steps.

<DiagramContainer title="Local Sequencer: Task Decomposition">
  <Column gap="lg">
    <Group title="Single Task Approach" color={colors.red}>
      <Box color={colors.red} variant="filled" size="lg">
        Check Data + Load Data + Transform
      </Box>
      <Box color={colors.slate} variant="subtle" size="sm">
        Restart everything on failure
      </Box>
    </Group>
    <Arrow direction="down" label="Transform to" />
    <Group title="Local Sequencer Approach" color={colors.green}>
      <Row gap="md">
        <Box color={colors.blue} variant="filled">
          Check Data
        </Box>
        <Arrow direction="right" />
        <Box color={colors.purple} variant="filled">
          Load Data
        </Box>
        <Arrow direction="right" />
        <Box color={colors.green} variant="filled">
          Transform
        </Box>
      </Row>
      <Box color={colors.slate} variant="subtle" size="sm">
        Restart only failed tasks
      </Box>
    </Group>
  </Column>
</DiagramContainer>

#### Decision Criteria

Use these three criteria to decide whether sequences should be based on the data orchestration layer or the data processing layer:

**Separation of Concerns:** If you struggle to name a task or the name becomes too long, this indicates too many operations are bundled together. Split them into separate tasks.

**Maintainability:** Processing layer sequentiality is challenging for maintenance. During backfilling or automatic retries, you'll recompute all successful tasks prior to the failed one. For example, if your readiness check calls 10 paid APIs and the job fails three times, costs escalate quickly.

**Implementation Effort:** Data orchestrators often provide abstractions for common tasks like running SQL queries or making API calls. Combining everything into a single unit prevents leveraging these facilities, forcing you to reinvent the wheel.

> **Insight**
>
> Defining restart boundaries is crucial. Think about what tasks should be able to restart individually. For instance, a Readiness Marker and Full Loader should fail independently—if loading fails, you don't need to rerun the readiness check since data presence is already confirmed.

#### Consequences

**Boundaries:** Incorrect boundary definitions can cause execution time to grow excessively or impact other pipelines if the scheduler can't scale. Find balance between task scope and quantity.

Consider restart boundaries (what should restart individually?) and transaction boundaries (what operations must execute as a single atomic unit?). For compute-expensive operations, place boundaries between costly steps to avoid recomputing intermediary datasets on retry.

**Examples**

Apache Airflow uses the `>>` operator to express dependencies:

```python
# Example 6-1: Local Sequencer in Apache Airflow
input_data_sensor >> load_data_to_table >> expose_new_table
```

This reads as: "Wait for data availability, then load it into an internal table, then expose the table to end users."

AWS EMR implements sequencing through the Step API:

```bash
# Example 6-2: Local Sequencer with AWS EMR
aws emr add-steps --cluster-id j=cluster_id --steps Type=Spark,Name="Spark Program",
  ActionOnFailure=TERMINATE_CLUSTER,Args=[--class com.waitingforcode.DataLoader]
aws emr add-steps --cluster-id j=cluster_id --steps Type=Spark,Name="Spark Program",
  ActionOnFailure=TERMINATE_CLUSTER,Args=[--class com.waitingforcode.DataPublisher]
```

The `ActionOnFailure=TERMINATE_CLUSTER` configuration prevents inconsistency by terminating on failure instead of proceeding with partial data.

At the data processing level, PySpark expresses sequencing implicitly through variable dependencies:

```python
# Example 6-3: Local Sequencer with PySpark
input_dataset: DataFrame = spark_session.read...
valid_and_enriched_dataset_to_write: DataFrame = input_dataset...
valid_and_enriched_dataset_to_write.write...
```

> **Insight**
>
> The Local Sequencer pattern demonstrates the power of data orchestrators compared to simple CRON expressions. However, CRON remains valid for isolated use cases without complex dependencies.

---

### 2.2. Isolated Sequencer

Pipelines implementing the Local Sequencer are often part of more complex workflows where multiple isolated workflows must collaborate to generate final insights.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern to find a way to combine physically isolated pipelines |
| **When to use** | ✓ Different teams own provider and consumer pipelines ✓ Organizational separation prevents merging ✓ Pipeline complexity requires splitting producer and consumer |
| **Core problem** | The biggest challenge is to keep all the pipelines in sync, plus the pattern adds extra operational constraint |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Data-based strategy (marker files) | Pipelines are loosely coupled and need room for evolution; consumer needs freedom to change |
| Task-based strategy (direct trigger) | Pipelines are tightly coupled; provider directly controls consumer execution |

> 📁 **Full code**: [chapter-06/01-sequence](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/01-sequence)

---

#### Problem

Your team is responsible for cleaning and enriching raw datasets to expose them as views in a data visualization tool. After meeting with the data visualization team, you agreed not to include dashboard dataset transformations directly in your data preparation pipeline, as your team won't be responsible for that part. Instead, you'll provide only the cleansed and enriched dataset. The visualization team will handle transformations independently.

#### Solution

**In plain English:** Connect physically separate pipelines owned by different teams. Think of it like a relay race where one runner hands the baton to the next—they're independent athletes but coordinated through a handoff mechanism.

**In technical terms:** Coordinate pipelines across organizational boundaries using either data-based triggers (marker files) or task-based triggers (direct pipeline invocation).

**Why it matters:** Enables team autonomy while maintaining data dependencies. Teams can evolve their pipelines independently within agreed-upon contracts.

<DiagramContainer title="Isolated Sequencer: Two Coordination Strategies">
  <Column gap="lg">
    <Group title="Data-Based Dependency (Loosely Coupled)" color={colors.blue}>
      <Row gap="md">
        <Column gap="sm">
          <Box color={colors.blue} variant="filled">
            Provider Pipeline
          </Box>
          <Box color={colors.slate} variant="subtle" size="sm">
            Generate dataset + marker
          </Box>
        </Column>
        <Arrow direction="right" label="marker file" />
        <Column gap="sm">
          <Box color={colors.purple} variant="filled">
            Consumer Pipeline
          </Box>
          <Box color={colors.slate} variant="subtle" size="sm">
            Wait for marker, then process
          </Box>
        </Column>
      </Row>
    </Group>
    <Arrow direction="down" />
    <Group title="Task-Based Dependency (Tightly Coupled)" color={colors.orange}>
      <Row gap="md">
        <Column gap="sm">
          <Box color={colors.orange} variant="filled">
            Provider Pipeline
          </Box>
          <Box color={colors.slate} variant="subtle" size="sm">
            Generate dataset + trigger consumer
          </Box>
        </Column>
        <Arrow direction="right" label="direct trigger" />
        <Column gap="sm">
          <Box color={colors.purple} variant="filled">
            Consumer Pipeline
          </Box>
          <Box color={colors.slate} variant="subtle" size="sm">
            Wait for trigger signal
          </Box>
        </Column>
      </Row>
    </Group>
  </Column>
</DiagramContainer>

#### Triggering Strategies

**Data-Based Strategy:** The provider generates a dataset and marker file to indicate readiness. The consumer listens for the marker and starts work upon detection. This approach creates loose coupling—pipelines can evolve independently as long as they respect the marker file contract.

**Task-Based Strategy:** The provider directly triggers the consumer pipeline after generating the dataset. This creates tight coupling—pipelines are physically separated but cannot operate independently. A simple pipeline rename on the consumer side breaks the entire dependency chain.

**Coupling Comparison:**

<ComparisonTable
  beforeTitle="Data-Based"
  afterTitle="Task-Based"
  beforeColor={colors.green}
  afterColor={colors.orange}
  items={[
    { label: "Coupling", before: "Loose - Independent evolution", after: "Tight - Coordinated changes required" },
    { label: "Consumer Freedom", before: "Can switch datasets freely", after: "Cannot skip datasets without breaking producer" },
    { label: "Scheduling", before: "Independent schedules", after: "Must align schedules" },
    { label: "Visibility", before: "Implicit dependency", after: "Explicit dependency" }
  ]}
/>

#### Consequences

**Scheduling:** Task-based solutions require aligned scheduling frequencies. If schedules differ, one pipeline must add complexity to handle the mismatch—either the producer skips triggering for some executions, or the consumer adapts its schedule and only processes when needed.

**Communication:** The Isolated Sequencer addresses pipelines managed by different teams, requiring strong communication culture. Technical solutions can check for changes on the other side, but this requires effort and may be impossible if security policies block incoming connections.

A more resilient approach involves organizational change to make communication efficient. Each team must be aware of inputs and outputs to communicate effectively with dependent parties, especially when introducing breaking changes.

> **Warning**
>
> Data lineage tools become essential in complex data systems with many isolated pipelines. They help visualize dependencies between datasets and identify downstream consumers. OpenLineage is an open source standard supporting major data tools for this purpose.

#### Examples

**Data-Based Approach** with Apache Airflow:

```python
# Example 6-4: Dataset dependency for Isolated Sequencer

# devices_loader pipeline
@task
def load_new_devices_to_internal_storage():
  ctx = get_current_context()
  partitioned_dir = f'{devices_file_location}/{ctx["ds_nodash"]}'
  internal_file_location = f'{partitioned_dir}/dataset.csv'
  shutil.copyfile(input_devices_file, internal_file_location)

input_data_sensor >> load_new_devices_to_internal_storage()

# devices_aggregator pipeline
input_data_sensor = FileSensor(
 task_id='input_data_sensor',
 filepath=devices_file_location + '/{{ ds_nodash }}/dataset.csv',
)
input_data_sensor >> load_data_to_table >> refresh_aggregates
```

The dependency is implicit—`input_data_sensor` in the aggregator enforces the contract, but there's no explicit link showing the two pipelines are interdependent.

**Task-Based Approach** with Apache Airflow:

```python
# Example 6-5: Trigger-based dependency for Isolated Sequencer

# devices_loader pipeline
success_execution_marker = ExternalTaskMarker(
 task_id='trigger_downstream_consumers',
 external_dag_id='devices_aggregator',
 external_task_id='downstream_trigger_sensor',
)
(input_data_sensor >> load_new_devices_to_internal_storage()
  >> success_execution_marker)

# devices_aggregator pipeline
parent_dag_sensor = ExternalTaskSensor(
 task_id='downstream_trigger_sensor',
 external_dag_id='devices_loader',
 external_task_id='trigger_downstream_consumers',
 allowed_states=['success'],
 failed_states=['failed', 'skipped']
)
parent_dag_sensor >> load_data_to_table >> refresh_aggregates
```

This approach uses `ExternalTaskMarker` and `ExternalTaskSensor` operators. The sensor represents the consumer waiting for provider execution, while the marker automates backfilling by detecting backfills made on the provider and running them locally.

---

## 3. Fan-In Patterns

The previous patterns involved sequences where steps follow each other in order. But data pipelines often create branches that eventually merge. This is where fan-in patterns come into play.

### 3.1. Aligned Fan-In

The Aligned Fan-In pattern requires all direct parent tasks to succeed before continuing.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that assumes all direct parent tasks must succeed before continuing |
| **When to use** | ✓ Dataset partitioned by time/dimension needs parallel processing ✓ Want to avoid processing too much data in single job ✓ Need faster feedback loops on failures |
| **Core problem** | Infrastructure spikes from simultaneous jobs and scheduling skew where all successful tasks wait for the slowest one |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Data orchestration with dynamic tasks | Creating multiple parallel branches that merge into common task (e.g., 24 hourly jobs merging into daily) |
| Data processing with UNION | Combining separate datasets vertically into single one for unified transformation |
| Data processing with JOIN | Combining datasets horizontally adding extra columns with fewer rows |

> 📁 **Full code**: [chapter-06/02-fan-in](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/02-fan-in)

---

#### Problem

Your pipeline generates daily aggregates of blog visits from raw visit events. However, the dataset is partitioned by hour as that organizational logic fits most use cases within your organization.

Processing the entire day at once doesn't make sense for your workflow, but you'd like to leverage hourly partitioning to avoid processing too much data in a single job. You need a way to process hourly partitions separately, then merge them into a daily aggregate.

#### Solution

**In plain English:** Think of parallel assembly lines producing parts throughout the day. At the end, all parts come together on a final assembly line that only starts when all parts are ready. Each hourly partition is a "part" that must be complete before daily aggregation begins.

**In technical terms:** Define separate execution branches that merge into a common task. All parent branches must complete successfully before the merge task executes. This creates a many-to-one dependency relationship.

**Why it matters:** Improves feedback loops by failing fast on small datasets rather than processing an entire day before detecting issues. Enables selective replay of only failed partitions instead of reprocessing all data.

<DiagramContainer title="Aligned Fan-In: Hourly to Daily Aggregation">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg">
      Clear Context
    </Box>
    <Arrow direction="down" />
    <Row gap="sm" wrap={true}>
      <Box color={colors.purple} variant="outlined" size="sm">00:00</Box>
      <Box color={colors.purple} variant="outlined" size="sm">01:00</Box>
      <Box color={colors.purple} variant="outlined" size="sm">02:00</Box>
      <Box color={colors.purple} variant="outlined" size="sm">03:00</Box>
      <Box color={colors.purple} variant="outlined" size="sm">04:00</Box>
      <Box color={colors.purple} variant="outlined" size="sm">...</Box>
      <Box color={colors.purple} variant="outlined" size="sm">23:00</Box>
    </Row>
    <Box color={colors.slate} variant="subtle" size="sm">
      24 parallel hourly processing jobs
    </Box>
    <Arrow direction="down" />
    <Box color={colors.green} variant="filled" size="lg">
      Generate Daily Trends
    </Box>
  </Column>
</DiagramContainer>

#### Implementation Approaches

**Data Orchestration Layer:** Define separate task branches that merge into a common child task. The orchestrator ensures the merge task runs only when all parent branches succeed.

**Data Processing Layer:** Use SQL operations to combine branch outputs:

- **UNION (Vertical Alignment):** Combines datasets by stacking rows, producing more rows with the same columns
- **JOIN (Horizontal Alignment):** Combines datasets by adding columns, producing the same or fewer rows with more columns

> **Insight**
>
> The Aligned Fan-In pattern optimizes feedback loops. Without it, an issue in the last hour might not surface until the end of processing an entire day's data. With decoupled hourly jobs, failures are detected faster on smaller volumes. Additionally, only the failed hour needs replay, not all 24 hours.

#### Consequences

**Infrastructure Spikes:** Running 24 jobs simultaneously can strain infrastructure without elastic provisioning. Solutions include reducing allowed concurrent runs or running branches incrementally (each hour processes when data arrives, with final aggregation in the last run).

**Scheduling Skew:** All successful child tasks wait for the slowest parent. Unbalanced execution times lead to scheduling skew, where merge task triggering depends on the longest parent.

**Scheduling Overhead:** Highly granular pipelines involve scheduling overhead. The orchestrator allocates resources to schedule and coordinate tasks rather than processing data. This is the price of improved decoupling and readability.

**Complexity:** More decoupling creates longer pipelines, potentially reducing readability. Find correct boundaries by asking: "What tasks belong to a single execution unit?" and "What operations should be backfilled individually?"

> **Warning**
>
> Avoid over-granularization. If tasks become too small, orchestration overhead exceeds processing benefits. Balance granularity with infrastructure capacity and maintenance complexity.

#### Examples

Apache Airflow implementation using dynamic pipeline creation:

```python
# Example 6-6: Aligned Fan-In in Apache Airflow
clear_context = PostgresOperator(...)
generate_trends = PostgresOperator(...)

for hour_to_load in [f"{hour:02d}" for hour in range(24)]:
 file_sensor = FileSensor(
  task_id=f'wait_for_{hour_to_load}',
  filepath=input_dir +'/date={{ ds_nodash }}/hour=' + hour_to_load+'/dataset.csv'
)
 visits_loader = PostgresOperator(
  task_id=f'load_hourly_visits_{hour_to_load}',
  params={'hour': hour_to_load}
 )

 clear_context >> file_sensor >> visits_loader >> generate_trends
```

This loop creates 24 separate task chains, all merging into the `generate_trends` task.

For static task lists, you can also declare parallel tasks explicitly:

```python
[load_data_1, load_data_2] >> process_data
```

At the data processing layer, PySpark implements fan-in with UNION:

```python
# Example 6-7: UNION in PySpark
input_dataset_1: DataFrame = ...
input_dataset_2: DataFrame = ...
output_dataset = input_dataset_1.unionByName(input_dataset_2)
```

> **Insight**
>
> PySpark's `unionByName` method combines datasets by column name rather than position, preventing errors from incompatible field ordering. The default UNION is position-based, which can incorrectly combine fields if column order differs.

---

### 3.2. Unaligned Fan-In

Sometimes requiring all parents to succeed adds latency or is semantically wrong. The Unaligned Fan-In pattern relaxes this constraint.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern where a child task can run even when some of the parents don't succeed |
| **When to use** | ✓ Partial dataset is acceptable when some parents fail ✓ Need to meet SLAs even with incomplete data ✓ Want fallback tasks when all parents fail |
| **Core problem** | The pattern may decrease readability and requires communicating partial data status to consumers |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Trigger on partial success | Some parents succeed and remaining failures are acceptable; produces partial dataset |
| Trigger on all failures | All parents fail and you need fallback or error management task |
| Completeness table companion | Need to track and communicate completeness metrics (e.g., 12 of 24 = 50% complete) |

> 📁 **Full code**: [chapter-06/02-fan-in](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/02-fan-in)

---

#### Problem

Your hourly-based processing with Aligned Fan-In has worked great for several weeks. However, the implementation lacks proper failure management.

A few times, an hour hasn't been correctly processed, preventing production of aggregated views for downstream consumers. After a meeting, you agreed it's better to release a partial dataset and fill gaps later. You need to evolve the pipeline to support this.

#### Solution

**In plain English:** Instead of waiting for all team members to finish before moving forward, proceed if enough members are done. It's like publishing a quarterly report even if one department's data is delayed—you note it's incomplete and update it later.

**In technical terms:** Relax parent outcome dependencies by configuring trigger conditions that allow child tasks to run when some (not all) parents succeed, or trigger alternative tasks when parents fail.

**Why it matters:** Enables partial dataset delivery to meet SLAs when complete data is unavailable, while providing transparency about completeness status to downstream consumers.

<DiagramContainer title="Unaligned Fan-In: Partial Success Scenarios">
  <Column gap="lg">
    <Group title="Scenario 1: Partial Success" color={colors.orange}>
      <Row gap="sm" wrap={true}>
        <Box color={colors.green} variant="filled" size="sm">✓ Hour 1</Box>
        <Box color={colors.green} variant="filled" size="sm">✓ Hour 2</Box>
        <Box color={colors.red} variant="filled" size="sm">✗ Hour 3</Box>
        <Box color={colors.green} variant="filled" size="sm">✓ Hour 4</Box>
      </Row>
      <Arrow direction="down" />
      <Box color={colors.orange} variant="filled">
        Generate Partial Dataset (50% complete)
      </Box>
    </Group>
    <Group title="Scenario 2: All Failed" color={colors.red}>
      <Row gap="sm" wrap={true}>
        <Box color={colors.red} variant="filled" size="sm">✗ Hour 1</Box>
        <Box color={colors.red} variant="filled" size="sm">✗ Hour 2</Box>
        <Box color={colors.red} variant="filled" size="sm">✗ Hour 3</Box>
        <Box color={colors.red} variant="filled" size="sm">✗ Hour 4</Box>
      </Row>
      <Arrow direction="down" />
      <Box color={colors.purple} variant="filled">
        Trigger Fallback Error Handler
      </Box>
    </Group>
  </Column>
</DiagramContainer>

#### Implementation

Configure trigger conditions in your data orchestration tool. Apache Airflow uses the `trigger_rule` attribute set to appropriate states. Less declarative environments require explicit evaluation of parent task outcomes.

#### Consequences

**Readability:** The pattern decreases readability when adding multiple downstream task types—one for success scenarios, another for failures. The execution flow becomes confusing without examining code.

Mitigation: Use orchestrator-specific error handling features like Apache Airflow's `on_failure_callback` function or AWS Step Functions' `Catch` field type.

**Partial Data:** When generating datasets from partially successful parents, communicate completeness status to consumers. Otherwise, they may assume complete data and make incorrect decisions.

Communication strategies:
- **Completeness table:** Store metrics like "12 of 24 hours = 50% complete"
- **Metadata tags:** Add completeness information to object storage metadata
- **Notifications:** Send emails or alerts to downstream consumers
- **Private staging:** Keep partial datasets in internal tables/folders until 100% complete

> **Warning**
>
> Never silently publish partial datasets without communicating completeness status. Downstream consumers must know they're working with incomplete data to avoid incorrect business decisions.

#### Examples

Apache Airflow implementation with trigger rules:

```python
# Example 6-9: Triggering condition for Unaligned Fan-In in Apache Airflow
clear_context = PostgresOperator(...)
generate_cube = PostgresOperator(
 # ...
 trigger_rule=TriggerRule.ALL_DONE
)

for hour_to_load in [f"{hour:02d}" for hour in range(24)]:
file_sensor = FileSensor(
  task_id=f'wait_for_{hour_to_load}',
  filepath=input_dir +'/date={{ ds_nodash }}/hour=' + hour_to_load+'/dataset.csv'
)
visits_loader = PostgresOperator(
  task_id=f'load_hourly_visits_{hour_to_load}',
  params={'hour': hour_to_load}
)

 clear_context >> file_sensor >> visits_loader >> generate_cube
```

The `trigger_rule=TriggerRule.ALL_DONE` configuration allows `generate_cube` to run when all parents complete, regardless of success or failure. This rule is hidden in code and not visible in the pipeline graph.

Adding a completeness flag to the output table:

```sql
-- Example 6-10: Approximate flag computation in SQL
INSERT INTO dedp.visits_cube (...,is_approximate)
SELECT ...,
 (SELECT CASE WHEN hours_subquery.all_hours = 24 THEN false ELSE true END FROM
  (SELECT COUNT(DISTINCT execution_time_hour_id) AS all_hours FROM dedp.visits_raw
    WHERE execution_time_id = '{{ ds }}')
 AS hours_subquery)
FROM dedp.visits_raw GROUP BY CUBE(...);
```

This subquery determines whether the table is based on complete or partial input data.

AWS Step Functions implementation (less declarative):

```python
# Example 6-11: Lambda functions for Unaligned Fan-In

# lambda-partitions-detector
def lambda_handler(event, context):
 # Detect partitions to process
 partitions_to_process = []
 return partitions_to_process

# lambda-partitions-processor
def lambda_handler(event, context):
 # Process each partition
 processing_result: bool
 return processing_result

# lambda-table-creator
def lambda_handler(event, context):
 table_metadata = {}
 if False in event['ProcessorResults']:
  table_metadata['is_partial'] = True
 # Create table with metadata
 return True
```

The `lambda-table-creator` examines all processing results and annotates the table with `is_partial` when failures occur. This requires explicit evaluation of parent outcomes rather than declarative trigger rules.

---

## 4. Fan-Out Patterns

While fan-in patterns merge branches into a common task, fan-out patterns do the opposite—one task becomes input for multiple tasks. This is useful when one dataset serves multiple teams for different purposes like analytics or data science.

### 4.1. Parallel Split

In the Parallel Split pattern, one parent task is a requirement for at least two child tasks. Children can run in parallel because their logic is isolated, sharing only the common parent requirement.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern where one parent task is a requirement for at least two child tasks that can run in parallel |
| **When to use** | ✓ Need to write processed dataset to multiple places ✓ Running migration with old and new pipelines ✓ Multiple teams need different output formats |
| **Core problem** | Blocked execution where triggering depends on slowest branch and hardware mismatches when branches need different compute capacity |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Data orchestration DSL branching | Creating parallel branches from single common point with independent downstream tasks |
| Data processing with persist/cache | Applying different processing logic on same input; read once and materialize to avoid redundant I/O |
| Split with intermediary dataset | Branches require different hardware (CPU-heavy vs memory-heavy); separate into generation + parallel consumption |

> 📁 **Full code**: [chapter-06/03-fan-out](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/03-fan-out)

---

#### Problem

You're replacing a legacy data processing framework written in C#, which nobody in your organization knows anymore. All maintainers left without documentation. You've reverse-engineered the logic and are rewriting it with a modern open source Python library. During migration, you prefer to keep old pipelines running until consumers switch to the new solution. Therefore, you need to write the processed dataset to two different places during the migration period.

#### Solution

**In plain English:** One factory produces raw materials that feed two different assembly lines making different products. The raw material production is shared, but each assembly line operates independently afterward.

**In technical terms:** One parent task creates output consumed by two or more child tasks that execute in parallel. Child tasks are independent except for their shared dependency on the parent's output.

**Why it matters:** Enables gradual migration strategies, supports multiple output formats from the same processing, and allows hardware optimization for different downstream workloads.

<DiagramContainer title="Parallel Split: Migration Strategy">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg">
      Wait for Input Data
    </Box>
    <Arrow direction="down" />
    <Row gap="lg">
      <Column gap="sm">
        <Box color={colors.orange} variant="filled">
          Load to Legacy Format (CSV)
        </Box>
        <Box color={colors.slate} variant="subtle" size="sm">
          Old pipeline
        </Box>
      </Column>
      <Column gap="sm">
        <Box color={colors.green} variant="filled">
          Load to New Format (Delta)
        </Box>
        <Box color={colors.slate} variant="subtle" size="sm">
          New pipeline
        </Box>
      </Column>
    </Row>
  </Column>
</DiagramContainer>

#### Implementation Considerations

**Data Orchestration Layer:** Straightforward implementation using data flow definition APIs with DSL or high-level programming abstractions.

**Data Processing Layer:** Several critical points:

1. **Single Read:** Don't trigger separate data reading operations. Read common data once and share it across branches using materialization (temporary table in SQL or `.persist()` in Apache Spark)

2. **Isolation:** Ensure parallel branches don't interfere with each other. Shared variables should be read-only or have compatible modifications across all writing processes

3. **Resource Allocation:** For time-sensitive computations, allocate dedicated compute resources or configure auto-scaling to accommodate split workload in parallel

> **Insight**
>
> Materializing the shared input dataset is crucial for performance. Reading the same data multiple times wastes I/O and compute resources. Use caching mechanisms to read once and share across all branches.

#### Consequences

**Blocked Execution:** For time-dependent pipelines where each execution runs only if the previous succeeded, triggering conditions are based on the slowest branch. Each pipeline execution waits for the slowest branch to complete. Failures worsen the situation—subsequent executions won't run at all.

Mitigation: Export slow branches to dedicated pipelines with dataset- or task-based dependency triggers (Isolated Sequencer pattern).

**Hardware Mismatch:** If the main job generates an intermediary dataset for two downstream jobs with different hardware needs (one CPU-heavy, one memory-heavy), you can't optimize infrastructure for both.

Solution: Split into three jobs—one generates the intermediary dataset, then two parallel jobs consume it on their dedicated hardware.

<DiagramContainer title="Hardware-Optimized Parallel Split">
  <Column gap="md">
    <Box color={colors.blue} variant="filled">
      Generate Intermediary Dataset
    </Box>
    <Arrow direction="down" />
    <Row gap="lg">
      <Column gap="sm">
        <Box color={colors.orange} variant="filled">
          CPU-Heavy Processing
        </Box>
        <Box color={colors.slate} variant="subtle" size="sm">
          High CPU, Low Memory
        </Box>
      </Column>
      <Column gap="sm">
        <Box color={colors.purple} variant="filled">
          Memory-Heavy Processing
        </Box>
        <Box color={colors.slate} variant="subtle" size="sm">
          Low CPU, High Memory
        </Box>
      </Column>
    </Row>
  </Column>
</DiagramContainer>

#### Examples

Apache Airflow implementation:

```python
# Example 6-12: Parallel Split in Apache Airflow
file_sensor = FileSensor(#...
 task_id='input_dataset_waiter')

for output_format in ['delta', 'csv']:
 load_job_trigger = SparkKubernetesOperator(# ...
  task_id=f'load_job_trigger_{output_format}',
  params={'output_format': output_format}
 )
 load_job_sensor = SparkKubernetesSensor(#...
  task_id=f'load_job_sensor_{output_format}')

 file_sensor >> load_job_trigger >> load_job_sensor
```

Similar to fan-in examples but without a common ending task. The single common point is the first sensor operation (`file_sensor`).

PySpark implementation with caching:

```python
# Example 6-13: Caching the input dataset in PySpark
input_dataset = (spark_session.read
  .schema('type STRING, full_name STRING, version STRING').format('json')
  .load(DemoConfiguration.INPUT_PATH))
input_dataset.persist(StorageLevel.MEMORY_ONLY)
input_dataset.write...
input_dataset.write...
```

The `persist(StorageLevel.MEMORY_ONLY)` call memorizes the dataset in memory, avoiding redundant reads. For limited RAM, use `MEMORY_AND_DISK` to spill to disk when memory is full.

Delta Lake write deduplication for retry safety:

```python
# Example 6-14: txnVersion and txnAppId with Delta Lake
batch_id = 1
app_id = 'devices-loader-v1'

input_dataset.write.mode('append').format('delta')
 .option('txnVersion', batch_id).option('txnAppId', app_id)
 .save(DemoConfiguration.DEVICES_TABLE))

(input_dataset.withColumn('loading_time', functions.current_timestamp())
  .withColumn('full_name',
    functions.concat_ws(' ', input_dataset.full_name, input_dataset.version))
  .write.mode('append').format('delta')
  .option('txnVersion', batch_id).option('txnAppId', app_id)
  .save(DemoConfiguration.DEVICES_TABLE_ENRICHED))
```

Delta Lake physically writes data only on the first run. Subsequent runs with identical `txnVersion` and `txnAppId` are ignored, preventing duplicates on retry. If this feature isn't natively available, leverage data idempotency patterns from Chapter 4.

---

### 4.2. Exclusive Choice

The Exclusive Choice pattern also relies on a common parent, but instead of running parallel downstream tasks, it chooses only one path.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern where there are two child tasks but only one should run at a time based on conditions |
| **When to use** | ✓ Need version-based execution without creating new pipeline ✓ Gradual migration from old to new job ✓ A/B testing of processing logic |
| **Core problem** | The greatest danger comes from flexibility leading to complexity factory with multiple conditions making pipelines barely readable |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Orchestration layer branching | Want visible branching in pipeline graphs; use branch operators (Airflow) or if-condition activities |
| Processing layer if-else | Simple conditions within job; be aware logic becomes hidden and hard to remember over time |
| Metadata-based conditions | Evaluating execution date, configuration flags; fast as no dataset interaction needed |
| Data-based conditions | Must check schema or dataset characteristics; slower but sometimes necessary |

> 📁 **Full code**: [chapter-06/03-fan-out](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/03-fan-out)

---

#### Problem

The migration you performed with Parallel Split works perfectly. Now you need to evolve the pipeline to execute the new job version starting January 1, 2024. For backfilling, prior dates should still run the previous job. You want this evolution without creating a new pipeline to keep the full execution history.

#### Solution

**In plain English:** Think of a railroad switch that directs a train onto one track or another based on conditions. The train (data) follows only one path, not both simultaneously.

**In technical terms:** Declare at least two downstream processes, then add a condition evaluator task before branching to decide which path to follow. Modern orchestration frameworks provide built-in support for conditional branching.

**Why it matters:** Enables gradual rollouts, A/B testing of processing logic, and version-based execution without creating separate pipelines or losing execution history.

<DiagramContainer title="Exclusive Choice: Version-Based Routing">
  <Column gap="md">
    <Box color={colors.blue} variant="filled">
      Wait for Input Data
    </Box>
    <Arrow direction="down" />
    <Box color={colors.purple} variant="filled">
      Check Execution Date
    </Box>
    <Row gap="lg">
      <Column gap="sm">
        <Arrow direction="down" label="< 2024-01-01" />
        <Box color={colors.orange} variant="filled">
          Legacy Job (CSV)
        </Box>
      </Column>
      <Column gap="sm">
        <Arrow direction="down" label=">= 2024-01-01" />
        <Box color={colors.green} variant="filled">
          New Job (Delta)
        </Box>
      </Column>
    </Row>
  </Column>
</DiagramContainer>

#### Implementation

**Data Orchestration Layer:** Use built-in branching operators:
- Apache Airflow: `BranchPythonOperator`
- Azure Data Factory: If Condition Activity
- AWS Step Functions: Choice State

**Data Processing Layer:** Use standard programming constructs like `if-else` or `switch` statements.

> **Insight**
>
> Implementing Exclusive Choice at the orchestration layer (rather than within jobs) makes branching logic visible in pipeline graphs and easier to understand. Hidden conditionals within data processing code become difficult to remember over time.

#### Consequences

**Complexity Factory:** Multiple if-else conditions create multiple execution branches that split and merge, making pipelines barely readable. No accepted threshold exists, but use the "rubber duck debugging" test—if explaining the pipeline to an imaginary newcomer leads to lots of questions, it's too complex.

**Hidden Logic:** Conditional statements within data processing jobs generate different datasets or interact with different output stores, becoming problematic over time. You'll understand the code for days or weeks after writing it, then forget as you solve other problems.

Better approach: Apply Exclusive Choice at the orchestration layer too. Compare these alternatives:

```python
# Example 6-15: Conditional execution in data processing layer
if condition_a:
  process_condition_a()
else:
  process_default()
```

versus

```python
# Example 6-16: Conditional execution in orchestration layer
if condition_a:
  python job_for_condition_a.py
else:
  python job_for_default.py
```

The orchestration layer approach makes branching explicit and visible.

**Heavy Conditions:** If conditions require processing data (not just metadata), this impacts job execution time. Prefer metadata-based conditions which are faster as they don't interact with the dataset.

When data processing is unavoidable, optimize by avoiding redundant processing and implementing incremental approaches that don't read entire datasets.

> **Warning**
>
> Avoid data-heavy condition evaluation. Metadata-based conditions (like checking execution date or configuration flags) are much faster than conditions requiring dataset scans or complex computations.

#### Examples

Apache Airflow implementation with conditional router:

```python
# Example 6-17: Conditional router for Exclusive Choice in Apache Airflow
def get_output_format_route(**context):
 migration_date = pendulum.datetime(2024, 2, 3)
 execution_date = context['execution_date']
 if execution_date >= migration_date:
  return 'load_job_trigger_delta'
 else:
  return 'load_job_trigger_csv'

format_router = BranchPythonOperator(
 task_id='format_router',
 python_callable=get_output_format_route,
 provide_context=True
)
```

The router function returns the task ID to execute based on the execution date. While this example shows two routes, you can add more—but remember, more branches reduce readability. Consider creating separate pipelines with `start_date` and `end_date` parameters instead of excessive branching.

Data processing layer implementation with external configuration:

```python
# Example 6-18: Exclusive Choice via job parameters in PySpark
class OutputType(str, Enum):
 delta_lake = 'delta'
 csv = 'csv'

parser = argparse.ArgumentParser(prog='...')
parser.add_argument('--output_type', required=True, type=OutputType)
args = parser.parse_args()

output_generation_factory = OutputGenerationFactory(args.output_type)

spark_session = output_generation_factory.get_spark_session()
raw_data = (spark_session.read...)

output_generation_factory.write_devices_data(raw_data, args.output_dir)
```

This leverages the software engineering Factory design pattern to hide creation logic behind an interface:

```python
# Example 6-19: Factory pattern supporting Exclusive Choice
class OutputGenerationFactory:

 def __init__(self, output_type: OutputType):
  self.type = output_type

 def get_spark_session(self) -> SparkSession:
  if self.type == OutputType.delta_lake:
   return (configure_spark_with_delta_pip(SparkSession...)
  else:
   return SparkSession.builder...getOrCreate()

 def write_devices_data(self, devices_data: DataFrame, output_location: str):
  if self.type == OutputType.delta_lake:
   devices_data.write.format('delta')...
  else:
   devices_data.coalesce(1).write...format('csv')...
```

The client code receives the appropriate `SparkSession` and write action automatically based on the output type. For more complex cases, consider dedicated classes for each writer type to eliminate repeated conditionals.

Schema-driven conditional execution:

```python
# Example 6-20: Exclusive Choice driven by schema change
input_dataset = ...
input_schema = detect_schema(input_dataset)
output_location = DemoConfiguration.DEVICES_TABLE_LEGACY
if len(input_schema.fields) >= 3:
 output_location = DemoConfiguration.DEVICES_TABLE_SCHEMA_CHANGED
```

This adapts behavior based on input schema (metadata), which is faster than processing data. However, conditions can use data too—just be aware of the performance cost.

---

## 5. Orchestration Patterns

So far, you've been organizing individual flows and their dependencies. At this stage, they're static resources on your orchestration layer. With orchestration patterns, they become dynamic components running data processing tasks.

### 5.1. Single Runner

The data orchestrator must run each declared pipeline. The question is how? The Single Runner is the most universal pattern, but this universality comes with runtime costs.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern that ensures there is always a single execution of a given pipeline |
| **When to use** | ✓ Incremental processing where current run depends on previous ✓ Logic compares current day's data with previous day ✓ Sequential execution is business requirement |
| **Core problem** | Backfilling is very slow due to sequential character and stragglers create increasingly delayed data for all downstream consumers |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Configuration-driven concurrency=1 | Orchestrator supports concurrency attributes (Airflow, Azure Data Factory) |
| Readiness Marker for previous run | Native concurrency control not available; wait for previous execution to complete |
| Partial pipeline backfilling | Only some steps need replay (e.g., skip processing, replay only loading) |

> 📁 **Full code**: [chapter-06/04-orchestration](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/04-orchestration)

---

#### Problem

In your recent project, you implemented a sessionization pipeline with the Incremental Sessionizer pattern from Chapter 5. Since it was a proof of concept, orchestration wasn't in scope. To validate sessions with business owners, you ran the job manually on demand. As the project enters the release cycle, you need to work on data orchestration.

You have the pipeline graph but need a way to execute it.

#### Solution

**In plain English:** Like a single-lane bridge that allows only one car at a time, the pipeline processes one execution at a time. The next car waits until the previous one crosses completely.

**In technical terms:** Configure pipeline concurrency to 1, ensuring at most one execution runs at any time. Sequential execution prevents race conditions when current logic depends on previous execution outputs.

**Why it matters:** Essential for incremental processing where each run builds on the previous run's results. Prevents data corruption from concurrent modifications to shared state.

<DiagramContainer title="Single Runner: Sequential Execution">
  <ProcessFlow
    direction="horizontal"
    steps={[
      { title: "Run 1", description: "Process day 1", icon: "1", color: colors.blue },
      { title: "Run 2", description: "Process day 2 (waits for Run 1)", icon: "2", color: colors.purple },
      { title: "Run 3", description: "Process day 3 (waits for Run 2)", icon: "3", color: colors.green }
    ]}
  />
</DiagramContainer>

#### Implementation

**Configuration-Driven:** Apache Airflow and Azure Data Factory support concurrency attributes set to 1.

**Readiness Marker:** If native support is unavailable, implement a Readiness Marker pattern waiting for previous execution to complete. Note: This doesn't prevent triggering future runs, which will all queue waiting for predecessors.

> **Insight**
>
> Single Runner is a business requirement, not a technical limitation. If you run multiple instances in parallel for incremental logic, results will be incorrect. The sequential constraint is necessary for data correctness.

#### Consequences

**Backfilling:** Limited concurrency becomes problematic during backfilling. Reprocessing is very slow due to sequential character. Unfortunately, little can be done since single concurrency is a business requirement that cannot be relaxed.

Mitigation: Determine if you need to backfill the entire pipeline. For example, if the pipeline has data processing and data loading steps, and you only need to reload the dataset to a different location, you can skip the processing part.

**Latency:** Stragglers (pipelines running slower than usual) create increasing delays. For an hourly pipeline that usually takes 30 minutes but suddenly takes 1.5 hours, data becomes increasingly delayed. Not only does your pipeline slow down, but all downstream consumers suffer from extra latency.

Mitigation: Add compute power on scalable infrastructure or improve processing logic.

> **Warning**
>
> Single Runner pipelines are vulnerable to cascading delays. One slow execution blocks all subsequent runs, creating a growing backlog. Monitor execution times closely and alert on degradation before delays become severe.

#### Examples

Apache Airflow implementation with concurrency limits:

```python
# Example 6-21: Concurrency limits in Apache Airflow
with DAG('visits_trend_generator', max_active_runs=1, default_args={
  'depends_on_past': True,
  # ...
```

Configuration breakdown:
- `max_active_runs=1`: Allows only one concurrent pipeline execution
- `depends_on_past=True`: Each task execution depends on the previous run's success. If task A fails in the previous run, task A in the current run won't start

AWS EMR cluster-wide concurrency control:

```bash
aws emr create-cluster --step-concurrency-level 1 ...
```

The `StepConcurrencyLevel` parameter determines how many jobs can run in parallel on the cluster.

Azure Data Factory concurrency configuration:

Azure Data Factory pipelines support the Concurrency setting. However, unlike Apache Airflow (which won't schedule new runs if one is active), Data Factory creates runs and stores them in a bounded queue supporting up to 100 concurrent runs. Additional scheduling attempts return a 429 "Too Many Requests" error when the queue is full.

---

### 5.2. Concurrent Runner

The backfilling and latency issues of Single Runner can be addressed by relaxing the concurrency constraint.

#### Quick Reference

| | |
|---|---|
| **What it is** | A pattern where concurrency is defined higher than 1 to allow multiple pipeline instances to run simultaneously |
| **When to use** | ✓ Ingested datasets are independent of each other ✓ Need to accelerate backfilling ✓ Want to reduce latency for isolated workloads |
| **Core problem** | Resource starvation in multitenant environments and shared state causing race conditions and unexpected side effects |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Configuration-driven concurrency>1 | Datasets are truly independent with no shared state; orchestrator supports concurrency settings |
| Workload management allocation | Multitenant environment needs resource protection; allocate specific capacity to user groups |
| Task-level depends_on_past | Some tasks need previous execution success while allowing overall pipeline concurrency |

> 📁 **Full code**: [chapter-06/04-orchestration](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-06/04-orchestration)

---

#### Problem

You're on the data ingestion team. Your goal is bringing data from external at-rest sources to your internal database as quickly as possible. Ingestion frequency ranges from 30 minutes to 1 hour, but sometimes processes take longer. Since it runs with Single Runner, all subsequent deliveries are delayed. You're wondering whether sequential execution is required, because loaded datasets are independent of each other.

#### Solution

**In plain English:** Like a multi-lane highway where multiple cars travel simultaneously without interfering with each other, independent datasets can load in parallel without conflicts.

**In technical terms:** Configure concurrency higher than 1, allowing multiple pipeline instances to run simultaneously. The orchestrator schedules the next available execution as long as currently running instances don't reach the maximum concurrency level.

**Why it matters:** Accelerates backfilling, reduces latency for independent workloads, and improves infrastructure utilization by processing multiple datasets simultaneously.

<DiagramContainer title="Concurrent Runner: Parallel Execution">
  <Row gap="md">
    <Column gap="sm">
      <Box color={colors.blue} variant="filled">Run 1</Box>
      <Box color={colors.slate} variant="subtle" size="sm">Dataset A</Box>
    </Column>
    <Column gap="sm">
      <Box color={colors.purple} variant="filled">Run 2</Box>
      <Box color={colors.slate} variant="subtle" size="sm">Dataset B</Box>
    </Column>
    <Column gap="sm">
      <Box color={colors.green} variant="filled">Run 3</Box>
      <Box color={colors.slate} variant="subtle" size="sm">Dataset C</Box>
    </Column>
    <Column gap="sm">
      <Box color={colors.orange} variant="filled">Run 4</Box>
      <Box color={colors.slate} variant="subtle" size="sm">Dataset D</Box>
    </Column>
  </Row>
  <Box color={colors.slate} variant="subtle" size="sm">
    All running simultaneously
  </Box>
</DiagramContainer>

#### Finding the Right Balance

Defining concurrency requires careful balance considering other pipelines and infrastructure capacity. Too high concurrency starves other workloads; too low underutilizes resources.

> **Insight**
>
> Concurrent Runner is appropriate only for truly independent datasets. If any execution depends on previous runs' results, concurrency will cause data corruption. Ensure independence before enabling parallelism.

#### Consequences

**Resource Starvation:** Particularly problematic in multitenant environments where the orchestrator is shared across teams. If multiple pipelines have high concurrency and run backfilling simultaneously, the scheduler may lack capacity to start other pipelines.

Solution: Implement workload management with concurrency control. Allocate specific compute capacity to user groups. Even if a team sets high concurrency, they can't exceed their allocated threshold.

Note: Serverless orchestrators like AWS Step Functions (allowing up to 10,000 parallel child workflows as of this writing) typically don't suffer from resource starvation.

**Shared State:** A common gotcha for concurrent execution. If pipelines work on shared components, concurrent nondeterministic execution causes problems due to unexpected side effects. For example, the Dynamic Late Data Integrator pattern from Chapter 4 could trigger backfilling multiple times (at best) or not at all for some execution dates (at worst) under concurrent execution.

> **Warning**
>
> Never enable concurrent execution for pipelines with shared state (like state tables, counters, or configuration files). Concurrent modifications lead to race conditions, data corruption, and unpredictable behavior.

#### Examples

Apache Airflow implementation:

```python
# Example 6-22: Concurrent orchestration in Apache Airflow
with DAG('devices_loader', max_active_runs=5,
 default_args={
 'depends_on_past': False,
# ...
```

Configuration breakdown:
- `max_active_runs=5`: Allows up to 5 concurrent executions
- `depends_on_past=False`: Tasks don't depend on previous executions

Note: You can change `depends_on_past=True` if particular tasks should depend on their prior executions. This doesn't affect concurrency configuration but might prevent pipeline advancement when encountering tasks with failed past executions.

Azure Data Factory flexibility:

Azure Data Factory supports concurrency and trigger-based dependency but not task-based dependency. This is less flexible than Apache Airflow's granular control.

---

## 6. Summary

In this chapter, you learned different ways to organize data flow dependencies across multiple pattern families.

### Key Takeaways

**Sequence Patterns** coordinate workflows locally with Local Sequencer or globally with Isolated Sequencer. Proper boundary definition keeps pipelines readable and maintainable.

<CardGrid
  columns={2}
  cards={[
    {
      title: "Local Sequencer",
      icon: "🔗",
      color: colors.blue,
      items: [
        "Chains tasks within one pipeline",
        "Improves readability and restart granularity",
        "Define boundaries by restart needs",
        "Balance scope and number of tasks"
      ]
    },
    {
      title: "Isolated Sequencer",
      icon: "🔗",
      color: colors.purple,
      items: [
        "Connects physically separated pipelines",
        "Data-based (loose) vs task-based (tight) coupling",
        "Enables cross-team collaboration",
        "Requires strong communication culture"
      ]
    }
  ]}
/>

**Fan-In Patterns** merge isolated execution branches, enabling parallelization. Choose aligned or unaligned versions based on business constraints.

<ComparisonTable
  beforeTitle="Aligned Fan-In"
  afterTitle="Unaligned Fan-In"
  beforeColor={colors.green}
  afterColor={colors.orange}
  items={[
    { label: "Parent Success", before: "All must succeed", after: "Partial success allowed" },
    { label: "Use Case", before: "Complete datasets required", after: "Partial datasets acceptable" },
    { label: "Complexity", before: "Simpler logic", after: "Complex trigger rules" },
    { label: "Transparency", before: "Clear success criteria", after: "Requires completeness tracking" }
  ]}
/>

**Fan-Out Patterns** create branches from a single task. Parallel Split executes multiple branches simultaneously, while Exclusive Choice follows only one path.

<CardGrid
  columns={2}
  cards={[
    {
      title: "Parallel Split",
      icon: "🔼",
      color: colors.orange,
      items: [
        "One parent, multiple parallel children",
        "Read shared data once, cache it",
        "Good for migration strategies",
        "Watch for hardware mismatches"
      ]
    },
    {
      title: "Exclusive Choice",
      icon: "🔀",
      color: colors.cyan,
      items: [
        "One parent, one selected child",
        "Condition-based routing",
        "Enables gradual rollouts",
        "Avoid excessive branching complexity"
      ]
    }
  ]}
/>

**Orchestration Patterns** manage pipeline concurrency. Single Runner ensures sequential execution for incremental logic, while Concurrent Runner allows parallel instances for independent datasets.

<ComparisonTable
  beforeTitle="Single Runner"
  afterTitle="Concurrent Runner"
  beforeColor={colors.red}
  afterColor={colors.green}
  items={[
    { label: "Concurrency", before: "Max 1 execution", after: "Multiple concurrent executions" },
    { label: "Use Case", before: "Incremental processing", after: "Independent datasets" },
    { label: "Backfilling", before: "Very slow", after: "Fast parallel processing" },
    { label: "Risk", before: "Cascading delays", after: "Resource starvation, shared state issues" }
  ]}
/>

### Design Principles

1. **Define Clear Boundaries:** Think about restart units, transaction units, and compute boundaries when splitting tasks

2. **Choose the Right Coupling:** Use loose coupling (data-based) when possible for flexibility; use tight coupling (task-based) only when necessary

3. **Communicate Completeness:** Always inform consumers about partial datasets; never silently publish incomplete data

4. **Optimize for Readability:** Balance granularity with complexity; avoid over-decoupling that creates unmanageable pipelines

5. **Match Concurrency to Dependencies:** Use Single Runner for dependent executions, Concurrent Runner for independent workloads

6. **Cache Shared Data:** Read once and materialize when multiple branches need the same input

Your responsibilities as a data engineer don't stop at defining data flow. There's another equally important aspect: data security. The next chapter will show you data engineering design patterns that help approach this essential area.

---

**Previous:** [Chapter 5: Data Value Design Patterns](./chapter5) | **Next:** [Chapter 7: Data Security Design Patterns](./chapter7)
