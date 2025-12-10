---
sidebar_position: 7
title: "Chapter 7: Data Security Design Patterns"
description: "Learn essential data security patterns including data removal, access control, data protection, and secure connectivity for modern data engineering systems."
---

import {
  Box, Arrow, Row, Column, Group,
  DiagramContainer, ProcessFlow, TreeDiagram,
  CardGrid, StackDiagram, ComparisonTable,
  colors
} from '@site/src/components/diagrams';
import PythonRunner from '@site/src/components/PythonRunner';
import CodeRunner from '@site/src/components/CodeRunner';

# Chapter 7: Data Security Design Patterns

> **"Security is not a product, but a process."**
>
> — Bruce Schneier

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Removal](#2-data-removal)
   - 2.1. [Pattern: Vertical Partitioner](#21-pattern-vertical-partitioner)
   - 2.2. [Pattern: In-Place Overwriter](#22-pattern-in-place-overwriter)
3. [Access Control](#3-access-control)
   - 3.1. [Pattern: Fine-Grained Accessor for Tables](#31-pattern-fine-grained-accessor-for-tables)
   - 3.2. [Pattern: Fine-Grained Accessor for Resources](#32-pattern-fine-grained-accessor-for-resources)
4. [Data Protection](#4-data-protection)
   - 4.1. [Pattern: Encryptor](#41-pattern-encryptor)
   - 4.2. [Pattern: Anonymizer](#42-pattern-anonymizer)
   - 4.3. [Pattern: Pseudo-Anonymizer](#43-pattern-pseudo-anonymizer)
5. [Connectivity](#5-connectivity)
   - 5.1. [Pattern: Secrets Pointer](#51-pattern-secrets-pointer)
   - 5.2. [Pattern: Secretless Connector](#52-pattern-secretless-connector)
6. [Summary](#6-summary)

---

## 1. Introduction

**In plain English:** Data security is about protecting your valuable datasets from unauthorized access, ensuring compliance with privacy laws, and maintaining control over who can see and modify your data.

**In technical terms:** Data security design patterns address multiple protection layers including compliance with regulations like GDPR and CCPA, fine-grained access control for tables and cloud resources, data protection through encryption and anonymization, and secure credential management for connectivity.

**Why it matters:** Without proper security measures, your organization faces serious risks including data breaches, regulatory fines, accidental data overwrites by unauthorized teams, and exposure of sensitive personal information. Implementing security patterns transforms your data infrastructure from vulnerable to resilient.

The easily accessible and valuable datasets created with data value and data flow design patterns are important business assets. They are also objects of envy for other market actors, including malicious ones. Data engineering can't stop at writing data processing jobs—nowadays, data engineers also need to think about security aspects.

### 1.1. Key Security Aspects

<CardGrid
  columns={2}
  cards={[
    {
      title: "Compliance",
      icon: "📋",
      color: colors.blue,
      items: [
        "GDPR in Europe",
        "CCPA in the US",
        "Right to be forgotten",
        "Personal data removal"
      ]
    },
    {
      title: "Access Control",
      icon: "🔐",
      color: colors.purple,
      items: [
        "Prevent accidental overwrites",
        "Team-based permissions",
        "Row and column level security",
        "Resource-based policies"
      ]
    },
    {
      title: "Data Protection",
      icon: "🛡️",
      color: colors.green,
      items: [
        "Encryption at rest",
        "Encryption in transit",
        "Data anonymization",
        "Pseudo-anonymization"
      ]
    },
    {
      title: "Secure Connectivity",
      icon: "🔌",
      color: colors.orange,
      items: [
        "Credential management",
        "Secrets storage",
        "Identity-based access",
        "Certificate authentication"
      ]
    }
  ]}
/>

> **Insight**
>
> Data security is not a one-time implementation but a continuous process. Even if you accidentally give access to a dataset location, encryption ensures the consumer would also need the decryption key to read the data. Layered security provides defense in depth.

---

## 2. Data Removal

Privacy regulations such as CCPA and GDPR define several important compliance requirements. One of these critical requirements focuses on personal data removal requests, where you must delete a user's data upon receiving a removal request from the user.

**In plain English:** When someone asks you to delete their personal information, you need a reliable way to remove it completely from your systems without breaking everything else.

**In technical terms:** Data removal patterns implement compliant deletion strategies that handle personal data removal requests while maintaining data integrity, minimizing computational overhead, and ensuring legal compliance within required timeframes.

**Why it matters:** Failure to properly implement data removal can result in massive regulatory fines, legal action, and loss of customer trust. Efficient removal strategies also save computational resources and storage costs.

### 2.1. Pattern: Vertical Partitioner

Smart data organization or workflow isolation can often solve even the most challenging problems. This rule applies to the first data removal pattern.

#### Quick Reference

| | |
|---|---|
| **What it is** | Vertical partitioning splits each row and writes the parts into different places based on attribute characteristics. |
| **When to use** | ✓ New personal data removal pipeline ✓ Dataset has immutable columns repeated in records ✓ Want to reduce storage overhead and deletion costs |
| **Core problem** | Optimizes write performance and deletion but reduces read performance as readers must join split rows. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Mutable/Immutable Split | Separate frequently changing attributes from unchanging personal data |
| Polyglot Persistence Split | Different storage systems need different parts of the same record |

> 📁 **Full code**: [chapter-07/01-personal-data-removal](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/01-personal-data-removal)

---

#### 2.1.1. Problem

You recently presented the first design doc for a new personal data removal pipeline. Your peers were enthusiastic, but some pointed out an important storage overhead. Several columns of your dataset are immutable—they never change, but they're present in each record. Examples include birthday or personal ID number.

Your peers asked you to store each immutable property only once. As a result, you'll have less data to delete in case of a data removal request.

#### 2.1.2. Solution

The Vertical Partitioner pattern divides the dataset into two parts: a mutable one and an immutable one.

**In plain English:** Instead of storing someone's birthday in every event they generate, store it once in a separate table. When they want their data deleted, you only need to remove one record instead of thousands.

**In technical terms:** Vertical partitioning splits each row by attributes and writes the parts into different storage locations. Frequently changing attributes go to one store, while immutable and PII attributes go to another, linked by a common identifier.

**Why it matters:** This approach dramatically reduces the computational cost and time required for data removal, as you're deleting one record instead of potentially thousands of duplicates.

<DiagramContainer title="Vertical Partitioning Architecture">
  <Column gap="lg">
    <Box color={colors.blue} variant="filled" size="lg" icon="📥">
      Incoming Event Stream
    </Box>
    <Arrow direction="down" label="split by attributes" />
    <Row gap="lg">
      <Group title="Mutable Storage" color={colors.green} direction="column">
        <Box color={colors.green} variant="filled" size="md">
          visit_id
        </Box>
        <Box color={colors.green} variant="filled" size="md">
          timestamp
        </Box>
        <Box color={colors.green} variant="filled" size="md">
          page_url
        </Box>
        <Box color={colors.green} variant="filled" size="md">
          user_id (key)
        </Box>
      </Group>
      <Group title="Immutable + PII Storage" color={colors.purple} direction="column">
        <Box color={colors.purple} variant="filled" size="md">
          user_id (key)
        </Box>
        <Box color={colors.purple} variant="filled" size="md">
          birthday
        </Box>
        <Box color={colors.purple} variant="filled" size="md">
          email
        </Box>
        <Box color={colors.purple} variant="filled" size="md">
          login
        </Box>
      </Group>
    </Row>
    <Arrow direction="down" label="on removal request" />
    <Box color={colors.red} variant="filled" size="lg" icon="🗑️">
      Delete ONE record from PII storage
    </Box>
  </Column>
</DiagramContainer>

> **Warning**
>
> You can combine vertical partitioning with horizontal partitioning to group related but split parts of a record in the same storage zone. However, this adds complexity to your data architecture.

##### Implementation Steps

<ProcessFlow
  direction="vertical"
  steps={[
    {
      title: "Identify Split Attributes",
      description: "Determine which columns are immutable/PII vs mutable, and choose a merge key",
      icon: "1",
      color: colors.blue
    },
    {
      title: "Adapt Ingestion Job",
      description: "Add attribute-based split logic using SELECT statements or projection methods",
      icon: "2",
      color: colors.purple
    },
    {
      title: "Write to Separate Storage",
      description: "Each query targets different columns and writes to dedicated data stores",
      icon: "3",
      color: colors.green
    },
    {
      title: "Apply Business Rules",
      description: "Implement deduplication and other rules specific to each storage",
      icon: "4",
      color: colors.orange
    }
  ]}
/>

#### 2.1.3. Consequences

Despite being a good performance optimization technique for data removal, the Vertical Partitioner pattern has some drawbacks for consumers.

<ComparisonTable
  beforeTitle="Without Vertical Partitioning"
  afterTitle="With Vertical Partitioning"
  beforeColor={colors.green}
  afterColor={colors.red}
  items={[
    {
      label: "Query Performance",
      before: "Fast - all data local",
      after: "Slower - requires joins across storage"
    },
    {
      label: "Query Complexity",
      before: "Simple - single table",
      after: "Complex - multiple tables to join"
    },
    {
      label: "Removal Cost",
      before: "High - delete many records",
      after: "Low - delete one record"
    },
    {
      label: "Storage Overhead",
      before: "High - duplicate immutable data",
      after: "Low - store once"
    }
  ]}
/>

**Query performance:** Vertical partitioning introduces data normalization where immutable properties live apart from mutable ones. This optimizes write performance by reducing volume, but reduces read performance as each reader must join split rows, involving network traffic.

**Querying complexity:** Data separation brings extra complexity to queries. Consumers must know that some properties may be in a different place. Mitigate this by exposing the dataset from a single entry point (such as a view), providing data documentation with data catalogs, or clearly exposing data lineage.

**Complexity in polyglot world:** In polyglot persistence where one dataset lives in different storage types simultaneously, you may need to apply vertical partitioning across different storage systems, including multiple data removal pipelines.

<DiagramContainer title="Polyglot Persistence with Vertical Partitioning">
  <Column gap="md">
    <Box color={colors.blue} variant="filled" size="lg" icon="📊">
      Split Job
    </Box>
    <Row gap="md">
      <Arrow direction="down" />
      <Arrow direction="down" />
    </Row>
    <Row gap="lg">
      <Column gap="sm">
        <Box color={colors.green} variant="outlined" size="md">
          Mutable Data
        </Box>
        <Arrow direction="down" label="consumers" />
        <Row gap="sm">
          <Box color={colors.cyan} variant="subtle" size="sm">
            Search DB
          </Box>
          <Box color={colors.cyan} variant="subtle" size="sm">
            Cache
          </Box>
        </Row>
      </Column>
      <Column gap="sm">
        <Box color={colors.purple} variant="outlined" size="md">
          PII Data
        </Box>
        <Arrow direction="down" label="consumers" />
        <Row gap="sm">
          <Box color={colors.pink} variant="subtle" size="sm">
            RDBMS
          </Box>
          <Box color={colors.pink} variant="subtle" size="sm">
            NoSQL
          </Box>
        </Row>
      </Column>
    </Row>
  </Column>
</DiagramContainer>

> **Warning**
>
> If you need to keep raw (not divided) data for some time, you'll need a complementary solution for data removal. The Vertical Partitioner pattern applies only from the first data transformation step. An easy solution would be to use a short retention period for unsplit data if it complies with the data removal request delay.

#### 2.1.4. Examples

Let's implement the Vertical Partitioner with Apache Kafka, Apache Spark, and Delta Lake. The first part splits incoming records using the `foreachBatch` output operation to create two datasets, each written to a different Apache Kafka topic.

```python
def split_visit_attributes(visits_to_save: DataFrame, batch_number: int):
    visits_to_save.persist()

    visits_without_user_context = (visits_to_save
        .filter('user_id IS NOT NULL AND context.user.login IS NOT NULL')
        .withColumn('context', F.col('context').dropFields('user'))
        .select(F.col('visit_id').alias('key'), F.to_json(F.struct('*')).alias('value')))
    # save to visits_without_user_context topic

    user_context_to_save = (visits_to_save.selectExpr('context.user.*', 'user_id')
        .select(F.col('user_id').alias('key'), F.to_json(F.struct('*')).alias('value')))
    # save to user_context_to_save topic

    visits_to_save.unpersist()
```

The split method uses simple column-based transformations to remove user information from the visits dataset and to transform only the user attributes for the user context dataset. The partitioned user context topic can be later converted into a Delta Lake table with another job using the MERGE operation to deduplicate entries:

```python
def save_most_recent_user_context(context_to_save: DataFrame, batch_number: int):
    deduplicated_context = context_to_save.dropDuplicates(['user_id']).alias('new')

    current_table = DeltaTable.forPath(spark_session, get_delta_users_table_dir())
    (current_table.alias('current')
        .merge(deduplicated_context, 'current.user_id = new.user_id')
        .whenMatchedUpdateAll().whenNotMatchedInsertAll()
        .execute()
    )
```

After these preparation steps, data removal in the Delta Lake table relies on the delete action:

```python
user_id_to_delete = '140665101097856_0316986e-9e7c-448f-9aac-5727dde96537'
users_table = DeltaTable.forPath(spark_session, get_delta_users_table_dir())
users_table.delete(f'user_id = "{user_id_to_delete}"')
```

> **Warning**
>
> This action requires running an additional VACUUM operation to remove the files from the deleted user that exceeded the retention period. Otherwise, you can still retrieve the user's data by reading an older version of the table.

For Apache Kafka, cleaning relies on a **tombstone message**—a special marker record for a deleted row. A tombstone message is composed of a key of the removed record and a null value. If you send it to a topic with a compaction cleanup policy (`cleanup.policy`), Apache Kafka will run a background compaction process that will delete all tombstone messages.

```bash
docker exec -ti ...  kafka-console-producer.sh  --bootstrap-server .... \
--topic ... --property parse.key=true --property key.separator=, \
--property null.marker=NULL

140665101097856_0316986e-9e7c-448f-9aac-5727dde96537,NULL
```

After executing the compaction process, the user shouldn't be in the topic anymore. This approach works for vertically partitioned user_context topics where there's always one occurrence per key, but not for events like user visits where multiple events share the same key.

---

### 2.2. Pattern: In-Place Overwriter

The Vertical Partitioner pattern is great if you start a new project or have enough time and resources to migrate existing workloads. However, if you're not in one of these comfortable positions, you may need to rely on the tried and true overwriting strategy.

#### Quick Reference

| | |
|---|---|
| **What it is** | In-Place Overwriter processes the whole dataset and filters out all records representing removed users, replacing the existing data with the filtered dataset. |
| **When to use** | ✓ Legacy system with no data organization strategy ✓ Lack of resources for refactoring ✓ Need universal solution for any storage technology |
| **Core problem** | Requires reading all the data which incurs serious I/O overhead and is more costly than Vertical Partitioner. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Native DELETE Support | Data store supports in-place operations (Delta Lake, Iceberg) |
| Staging Area Simulation | Using raw file formats (JSON, CSV) without native deletion |
| Compaction Strategy | Apache Kafka topics with compaction cleanup policy enabled |

> 📁 **Full code**: [chapter-07/01-personal-data-removal](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/01-personal-data-removal)

---

#### 2.2.1. Problem

You inherited a legacy system where terabytes of data are stored in time-based horizontal partitions. There is no personal data management strategy defined. Despite this legacy character, the project is still widely used within your organization and needs to comply with new privacy regulations requiring personal data removal upon user request.

#### 2.2.2. Solution

The current architecture and lack of resources for refactoring leave you with no choice but to apply the In-Place Overwriter pattern.

**In plain English:** When you can't reorganize your data, you need to read through all of it, filter out the deleted user's information, and write a new version without their data—like crossing out someone's name in every page of a book.

**In technical terms:** The In-Place Overwriter pattern processes the entire dataset, filters out records representing removed users, and replaces the existing data with the filtered dataset. For stores with native deletion support, it uses DELETE statements; for raw file formats, it simulates deletion through rewriting.

**Why it matters:** This pattern provides a universal data removal solution that works regardless of how your data is currently organized, making it essential for legacy systems that can't be easily refactored.

The implementation heavily depends on the data storage technology. If your data store natively supports in-place operations, the implementation consists of running a DELETE statement that targets entities to remove via a WHERE condition.

<DiagramContainer title="Deletion Approaches">
  <Row gap="lg">
    <Group title="Native Deletion Support" color={colors.green} direction="column">
      <Box color={colors.green} variant="filled" size="md" icon="🗄️">
        Delta Lake / Iceberg
      </Box>
      <Arrow direction="down" />
      <Box color={colors.blue} variant="outlined" size="sm">
        DELETE WHERE user_id = '...'
      </Box>
      <Arrow direction="down" />
      <Box color={colors.orange} variant="outlined" size="sm">
        VACUUM to reclaim space
      </Box>
    </Group>
    <Group title="File Format Simulation" color={colors.purple} direction="column">
      <Box color={colors.purple} variant="filled" size="md" icon="📁">
        JSON / CSV
      </Box>
      <Arrow direction="down" />
      <Box color={colors.blue} variant="outlined" size="sm">
        Read all files
      </Box>
      <Arrow direction="down" />
      <Box color={colors.blue} variant="outlined" size="sm">
        Filter out removed users
      </Box>
      <Arrow direction="down" />
      <Box color={colors.blue} variant="outlined" size="sm">
        Write to staging
      </Box>
      <Arrow direction="down" />
      <Box color={colors.orange} variant="outlined" size="sm">
        Promote to production
      </Box>
    </Group>
  </Row>
</DiagramContainer>

> **Insight**
>
> Deletion vectors provide two approaches to managing deletes. The first identifies removed rows and writes them to a smaller side file to reduce writing footprint. With this approach, the consumer removes deleted rows at reading time. The opposite approach is more writer-heavy as it writes all but removed entries to the files so the consumer can directly use them.

You may need to complete deletion queries with a data cleaning operation. This applies especially to open-table file formats such as Apache Iceberg and Delta Lake, which often provide time travel features to restore datasets to prior versions. If you delete personal data but don't reclaim the data blocks storing the removed rows, the personal data will still be there.

##### Staging Area Workflow

If your storage doesn't provide native deletion capacity—for example, when using raw file formats like JSON and CSV—you must simulate it. To avoid side effects, you shouldn't replace the dataset directly, as the job can retry or fail, causing data loss. Instead, rely on a staging area workflow:

<ProcessFlow
  direction="vertical"
  steps={[
    {
      title: "Read Dataset",
      description: "Process the whole dataset from production storage",
      icon: "1",
      color: colors.blue
    },
    {
      title: "Filter Removed Users",
      description: "Apply filter conditions to exclude records of deleted users",
      icon: "2",
      color: colors.purple
    },
    {
      title: "Write to Staging",
      description: "Save filtered results to internal staging area (private)",
      icon: "3",
      color: colors.green
    },
    {
      title: "Validate Completion",
      description: "Ensure the job completed successfully without errors",
      icon: "4",
      color: colors.orange
    },
    {
      title: "Promote to Production",
      description: "Run data promotion job to overwrite public dataset",
      icon: "5",
      color: colors.cyan
    }
  ]}
/>

> **Warning**
>
> If your data retention period is shorter than the delay for taking data removal action, you might consider it as a data removal strategy. However, this is just an implementation suggestion—please double-check with your Chief Data Officer (CDO) and legal department before using it as a final solution.

#### 2.2.3. Consequences

The pattern performs many read and write operations, with serious consequences for the system.

**I/O overhead:** Reading and overwriting files incurs serious I/O overhead. Over time, the storage space can nearly double in size and lead to increased throughput. This overhead will be smaller if your data storage layer can avoid reading irrelevant files for the filter condition. Apache Parquet and table file formats that rely on it (like Delta Lake and Apache Iceberg) store statistics in metadata that allow query engines to skip data blocks not matching the removed user.

**Cost:** As the pattern requires reading all the data, it's more costly than the Vertical Partitioner pattern. If you have 2,000 records for one removed entity, with the Vertical Partitioner you need to read and drop only one entry, while with the In-Place Overwriter pattern, 2,000 records will be impacted. To mitigate this, try grouping data removal requests and execute one pipeline for all requests instead of one per demand.

<ComparisonTable
  beforeTitle="Vertical Partitioner"
  afterTitle="In-Place Overwriter"
  beforeColor={colors.green}
  afterColor={colors.orange}
  items={[
    {
      label: "Records to Process",
      before: "1 record",
      after: "All records (e.g., 2,000)"
    },
    {
      label: "I/O Operations",
      before: "Minimal",
      after: "Read entire dataset"
    },
    {
      label: "Cost per Removal",
      before: "Low",
      after: "High"
    },
    {
      label: "Implementation Complexity",
      before: "Requires reorganization",
      after: "Works with existing layout"
    }
  ]}
/>

#### 2.2.4. Examples

Let's see how to delete a row in Delta Lake and JSON file formats with Apache Spark. The Delta Lake example uses the same code as the Vertical Partitioner pattern (simple DELETE statement), so let's focus on why overwriting data in flat file formats like JSON is more challenging:

```python
input_raw_data = spark_session.read.text(get_input_table_dir())
df_w_user_column = input_raw_data.withColumn(
    'user', F.from_json('value', 'user_id STRING')
)

user_id = '139621130423168_029fba78-15dc-4944-9f65-00636566f75b'
to_save = df_w_user_column.filter(f'user.user_id != "{user_id}"').select('value')
to_save.write.mode('overwrite').format('text').save(get_staging_table_dir())
```

Two important things to keep in mind: First, we don't want to alter the dataset, hence our use of the simplest writing API possible (text). Second, to save space, we don't extract all attributes but only the one(s) used in the filter (`user_id` in our case).

The writer generates a new filtered dataset in a staging location—a temporary storage area where you can keep your data private before exposing it to end users. As Apache Spark is a distributed and transactionless processing layer, we can't simply overwrite files in the final location as this may leave a partially valid result in cases of failure. The writer first generates a dataset in the staging location and only later promotes it to the final output with a rename-like command adapted to your storage layer:

```bash
aws s3 rm ${BUCKET}/output --recursive
aws s3 mv ${BUCKET}/staging ${BUCKET}/output --recursive
```

Of course, the copy can also fail, but in that case, you still have the new dataset ready to be copied in the staging location.

> **Warning: Impossible Rollback**
>
> The staging-based approach works for our scenario, but it's not perfect. If your data removal job has bugs and you need to replay it, you won't be able to use the original dataset because it was overwritten. To mitigate this issue, you can rely on the Proxy pattern or enable data versioning at your infrastructure level. All major object stores (S3, Azure Storage, GCS) support versioning.

---

## 3. Access Control

Even the most efficient data removal pattern will not be enough to provide the basic security that should come with access control. Besides being compliant, you also want to let only authorized users access the most critical sections of your data. Keeping personal data private is crucial, but the data itself can be the biggest competitive asset in your possession.

**In plain English:** Access control is like having different keys for different rooms in a building—some people can only access the lobby, while others can access specific offices, and a few can access the vault.

**In technical terms:** Access control patterns implement authorization mechanisms at multiple granularities, from entire tables down to specific columns and rows, using identity-based and resource-based policies to enforce the principle of least privilege.

**Why it matters:** Without proper access control, any user could accidentally or maliciously overwrite critical datasets, expose sensitive personal information, or access competitive intelligence, leading to data loss, compliance violations, and competitive disadvantage.

### 3.1. Pattern: Fine-Grained Accessor for Tables

The first pattern fits perfectly into the classical analytical world, where you create users or groups and assign them permissions to access particular tables. As it turns out, it's possible to have finer access control than that.

#### Quick Reference

| | |
|---|---|
| **What it is** | Fine-Grained Accessor for Tables implements column-level and row-level security through GRANT operators, policy tags, masking functions, or row filters. |
| **When to use** | ✓ Users authorized for tables but not all columns/rows ✓ Need low-level resource authorization ✓ Secure data sharing within organizations |
| **Core problem** | Row-level and column-level security protections may be expressed as SQL functions dynamically added to queries causing query overhead. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| GRANT Operator | PostgreSQL, Redshift for defining column scope |
| Policy Tags | GCP BigQuery with Data Catalog tags on columns |
| Data Masking Functions | Databricks, Snowflake for conditional column display |
| Row Filters / Policies | Dynamic WHERE conditions based on user identity |

> 📁 **Full code**: [chapter-07/02-access-control](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/02-access-control)

---

#### 3.1.1. Problem

After migrating your previous HDFS/Hive workloads to a cloud data warehouse, you need to implement a secure access policy. The first part is relatively easy as the new data warehouse supports classical users and group creation to manage access to tables. However, there's an extra demand from stakeholders: users, despite their authorization to access a given table, may not have permissions to read all columns and rows. You need to implement an authorization mechanism for these low-level resources as well.

#### 3.1.2. Solution

The Fine-Grained Accessor for Tables pattern solves the low-level data access issue.

**In plain English:** Instead of giving someone access to an entire spreadsheet, you can let them see only specific columns or rows—like allowing a sales person to see their own sales but not everyone else's.

**In technical terms:** Fine-grained table access implements column-level and row-level security through GRANT operators, policy tags in data catalogs, data masking functions, or row filters that dynamically add WHERE conditions based on user identity or group membership.

**Why it matters:** This pattern enables secure data sharing within organizations, allowing multiple teams to work with the same tables while seeing only the data they're authorized to access, without expensive data duplication or complex ETL processes.

<TreeDiagram
  root={{
    label: "Fine-Grained Table Access",
    color: colors.blue,
    children: [
      {
        label: "Column-Level Security",
        color: colors.purple,
        children: [
          { label: "GRANT SELECT(cols)", color: colors.cyan },
          { label: "Policy Tags", color: colors.cyan },
          { label: "Masking Functions", color: colors.cyan }
        ]
      },
      {
        label: "Row-Level Security",
        color: colors.green,
        children: [
          { label: "Row Filters", color: colors.orange },
          { label: "Row Access Policies", color: colors.orange },
          { label: "View-Based Guards", color: colors.orange }
        ]
      }
    ]
  }}
/>

##### Column-Level Access Implementations

<CardGrid
  columns={3}
  cards={[
    {
      title: "GRANT Operator",
      icon: "1",
      color: colors.blue,
      items: [
        "PostgreSQL, Redshift",
        "Define column scope",
        "GRANT SELECT(col_A, col_B)",
        "Direct permissions"
      ]
    },
    {
      title: "Policy Tags",
      icon: "2",
      color: colors.purple,
      items: [
        "GCP BigQuery",
        "Data Catalog tags",
        "Assign to columns",
        "Fine-Grained Reader role"
      ]
    },
    {
      title: "Data Masking",
      icon: "3",
      color: colors.green,
      items: [
        "Databricks, Snowflake",
        "Column masking functions",
        "Conditional display",
        "Group-based visibility"
      ]
    }
  ]}
/>

Example of column-level access with GRANT:

```sql
GRANT SELECT(col_A, col_B) ON my_table TO some_user;
```

Example of column-masking function in Databricks:

```sql
CREATE FUNCTION ip_mask(ip STRING)
  RETURN CASE WHEN is_member('engineers') THEN ip ELSE '.' END;

CREATE TABLE visits (
  visit_id STRING,
  ip STRING MASK ip_mask);
```

##### Row-Level Access Implementations

Row-level security often relies on dynamic functions that add a WHERE condition to the executed query on the fly. They may have different names: Databricks calls them ROW FILTER, Amazon Redshift calls them Row-Level Security, while GCP BigQuery and Snowflake classify them as row access policies.

This implementation consists of defining a separate database object that adds a dynamic condition to all select requests made on a protected table.

If the database doesn't provide native support for row-level access authorization, you can simulate it by exposing a table from a view with an access guard condition:

```sql
CREATE VIEW users_blogs AS
SELECT ... FROM blogs WHERE table.blog_author = current_user
```

The created view returns the blogs owned by the user issuing the query. The condition will be different for each user, and consequently, each user will have a dedicated version of the view.

#### 3.1.3. Consequences

This feature is natively supported in databases, so its number of drawbacks is relatively small compared to other patterns.

**Row-level security limits:** Most row-level security implementations have a limited scope of applications consisting of attributes you can get directly from the connection session, such as user name, user group, and IP.

**Data type:** If your column is of a complex type, such as a nested structure, you may not be able to apply the simple column-based access strategy. Column-based permissions refer to columns, so to apply them to initially nested attributes, you'll need to unnest them first and expose them from another table, or use the Dataset Materializer pattern if it supports fine-grained permissions.

**Query overhead:** Row-level and column-level security protections may be expressed as SQL functions dynamically added to queries executed against the secured table. If this overhead causes unexpected latency, you can try to mitigate it by creating a dedicated table or view with the Dataset Materializer pattern, only with the data the user or group is allowed to read. Of course, this mitigation also has limitations, such as data duplication or governance for many access groups.

#### 3.1.4. Examples

PostgreSQL is a great open source implementation supporting both column- and row-level access policies. Let's begin with column-based access, which relies on the GRANT statement used to define the scope of access for a user or group:

```sql
GRANT SELECT(id, login, registered_datetime) ON dedp.users TO user_a;
```

After that, whenever `user_a` issues a query that includes unlisted columns, such as `SELECT *`, the database will return an error like "ERROR: permission denied for table users."

When it comes to row-level controls, PostgreSQL uses policies that add conditions whenever someone queries a protected table:

```sql
ALTER TABLE dedp.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_row_access ON dedp.users USING (login = current_user);
```

Besides PostgreSQL, other data stores, including managed cloud services, also support row-level access. That's the case with AWS DynamoDB, a NoSQL database with key-based access. You can simulate row access policy based on user login with an IAM policy:

```json
{
  "Statement":[{
    "Sid": "...",
    "Effect":"Allow",
    "Action":["..."],
    "Resource":["arn:aws:dynamodb:us-west-1:123456789012:table/users"],
    "Condition":{
      "ForAllValues:StringEquals":{
        "dynamodb:LeadingKeys":["${www.amazon.com:user_id}"]
      }
    }
  }]
}
```

The condition in DynamoDB relies on the `dynamodb:LeadingKeys` attribute, which allows each user to read only the rows starting with their user_id value.

---

### 3.2. Pattern: Fine-Grained Accessor for Resources

The access-based pattern is great when it comes to table-based datasets. However, databases are not the only data stores used by data engineers. Many data engineers also work with other data stores that are often fully managed by their cloud provider. The next pattern applies to these cloud-based resources.

#### Quick Reference

| | |
|---|---|
| **What it is** | Fine-Grained Accessor for Resources implements least privilege through resource-based or identity-based policies controlling which actions each entity can perform on specific cloud resources. |
| **When to use** | ✓ Overly broad permissions detected ✓ Need to implement least privilege principle ✓ Working with cloud-managed resources |
| **Core problem** | Least privilege principle can lead to many small access policy definitions that will be difficult to maintain in complex environments. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Resource-Based Access | Define access scope at resource level (GCS buckets with IAM policies) |
| Identity-Based Access | Define permissions at identity level (AWS IAM roles for services) |
| Tag-Based Access | Use custom metadata attributes for granular runtime conditions |

> 📁 **Full code**: [chapter-07/02-access-control](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/02-access-control)

---

#### 3.2.1. Problem

A security audit detected overly broad permissions in your cloud account. One of the spotted dangers is the possibility that one data processing job could overwrite all datasets available in your object store. The auditor presented you with a security best practice called **least privilege**, which assigns the minimum required permissions for each component of your system, so that a data processing job can only manipulate the dataset it's really working on.

You're now looking for a technical solution to implement the least privilege principle on your cloud provider.

#### 3.2.2. Solution

The good news is that all major cloud providers—including AWS, Azure, and GCP—come with an implementation for the least privilege principle, which is the backbone of the Fine-Grained Accessor for Resources pattern.

**In plain English:** It's like giving each employee a key card that only opens the doors they need for their job, rather than a master key that opens everything.

**In technical terms:** Fine-grained resource access implements least privilege through resource-based policies (attached to resources like S3 buckets) or identity-based policies (attached to users, groups, or roles), using IAM services to control which actions each entity can perform on specific cloud resources.

**Why it matters:** Without fine-grained access control, a misconfigured or compromised job could accidentally or maliciously delete, overwrite, or exfiltrate all data in your cloud environment, causing catastrophic data loss or security breaches.

<DiagramContainer title="Resource-Based vs Identity-Based Access">
  <Row gap="lg">
    <Group title="Resource-Based" color={colors.blue} direction="column">
      <Box color={colors.blue} variant="filled" size="md" icon="🪣">
        S3 Bucket
      </Box>
      <Box color={colors.blue} variant="outlined" size="sm">
        Policy: Allow user X
      </Box>
      <Arrow direction="down" />
      <Box color={colors.purple} variant="filled" size="md" icon="🪣">
        GCS Bucket
      </Box>
      <Box color={colors.purple} variant="outlined" size="sm">
        Policy: Allow user Y
      </Box>
      <Box color={colors.slate} variant="subtle" size="sm">
        Policies on resources
      </Box>
    </Group>
    <Group title="Identity-Based" color={colors.green} direction="column">
      <Box color={colors.green} variant="filled" size="md" icon="👤">
        User / Role
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        Can read bucket A
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        Can write bucket B
      </Box>
      <Arrow direction="down" />
      <Row gap="sm">
        <Box color={colors.cyan} variant="subtle" size="sm">
          Bucket A
        </Box>
        <Box color={colors.cyan} variant="subtle" size="sm">
          Bucket B
        </Box>
      </Row>
      <Box color={colors.slate} variant="subtle" size="sm">
        Policies on identities
      </Box>
    </Group>
  </Row>
</DiagramContainer>

Cloud providers have two different strategies for limiting access to resources:

##### Resource-Based Approach

Defines the access scope at the resource level directly. For example, to control access to a GCS bucket on GCP, you assign an IAM policy:

```hcl
data "google_iam_policy" "admin_access" {
  binding {
    role = "roles/storage.admin"
    members = [
      "user:admingcs@waitingforcode.com",
    ]
  }
}

resource "google_storage_bucket_iam_policy" "policy" {
  bucket = google_storage_bucket.default.name
  policy_data = data.google_iam_policy.admin_access.policy_data
}
```

##### Identity-Based Approach

Access permissions are defined directly at the identity level (for example, a human or application user). AWS supports this mode with IAM roles assumed by services:

```hcl
data "aws_iam_policy_document" "emr_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["elasticmapreduce.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "job_role" {
  name               = "visits-processor-role"
  assume_role_policy = data.aws_iam_policy_document.emr_assume_role.json
}

resource "aws_iam_policy" "visits_read_writer_policy" {
  name = "visits_rw"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = ["kinesis:Get*", "kinesis:Describe*", "kinesis:List*", "kinesis:Put*"]
      Effect   = "Allow"
      Resource = ["arn:aws:kinesis:us-east-1:1234567890:streams/visits"]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "policy_attachment" {
  role       = aws_iam_role.job_role.name
  policy_arn = aws_iam_policy.visits_read_writer_policy.arn
}
```

> **Insight**
>
> Fine-grained permissions are often flexible. They can target a specific resource, a set of resources starting with the same prefix, or even a resource based on runtime conditions. Tag-based access control uses custom metadata attributes (tags) associated with each resource individually for the most granular control.

Example of tag-based access policy for AWS S3:

```json
{
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:PutObject",
    "Resource": "*",
    "Condition": {
      "ForAllValues:StringEquals": {
        "aws:TagKeys": ["${www.amazon.com:user_id}"]
      }
    }
  }]
}
```

#### 3.2.3. Consequences

Defining access policies shouldn't be difficult from a technical standpoint as you can rely on infrastructure as code (IaC) tools or custom scripts. That doesn't mean there are no consequences, though.

**Security by the book trade-off:** The least privilege principle holds that a user or group should have access only to the resources it needs at the moment. Although this is a great principle, it can lead to the creation of many small access policy definitions that will be difficult to maintain in complex environments.

To mitigate this issue and keep resources down to a manageable size, you might use wildcard-based access. Instead of defining each cloud resource individually, you could use a prefix like `visits*`. As a result, the access policy would apply to all resources starting with "visits." However, this may violate the least privilege principle because you can't guarantee the user should have access to all visits-prefixed resources created in the future. Discuss this simplification strategy with your security department.

**Complexity:** If you use both resource- and identity-based approaches in the same project, you may be inadvertently increasing system complexity. Whenever possible, prefer one solution, preferably the one that covers more of your use cases.

**Quotas:** As with any cloud resource, even access policies have limitations. For example, AWS IAM allows 1,500 custom policies by default, and GCP IAM has a limit on custom roles within a project (300). Some limits are flexible, though, so you can ask your cloud provider to increase them.

#### 3.2.4. Examples

Let's see how the Fine-Grained Accessor for Resources pattern behaves in the context of reading data from an S3 bucket. Assuming you don't have access to the tested bucket, you should get a permission error:

```bash
$ aws s3 ls s3://dedp-visits-301JQN/

An error occurred (AccessDenied) when calling the
ListObjectsV2 operation: Access Denied
```

To fix it with the **identity-based approach**, create a role with S3 reading actions scoped to our bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "VisitsS3Reader",
    "Effect": "Allow",
    "Action": ["s3:Get*", "s3:List*"],
    "Resource": [
      "arn:aws:s3:::dedp-visits-301JQN/*",
      "arn:aws:s3:::dedp-visits-301JQN"
    ]
  }]
}
```

After creating this role and assigning it to your user, the listing operation should succeed.

As an alternative, use the **resource-based approach**. This command authorizes a visits-s3-reader user to read data from our S3 bucket:

```bash
$ aws s3api put-bucket-policy --bucket dedp-visits-301JQN --policy file://policy.json

# policy.json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::123456789012:user/visits-s3-reader"},
    "Action": ["s3:Get*", "s3:List*"],
    "Resource": "arn:aws:s3:::dedp-visits-301JQN/*"
  }]
}
```

---

## 4. Data Protection

You might be thinking that controlling data access at the logical level—meaning either the database or cloud services scope—is enough to build a fully secure system. Unfortunately, it's only part of the solution. A missing part concerns securing data itself, hence protecting it against unexpected usage.

**In plain English:** Access control is like locking the door to your house. Data protection is like putting your valuables in a safe inside the house—even if someone gets through the door, they still can't use what's inside.

**In technical terms:** Data protection patterns implement defense-in-depth strategies through encryption (making data unreadable without keys), anonymization (removing identifying information), and pseudo-anonymization (masking or tokenizing sensitive values while preserving utility).

**Why it matters:** Access controls can be misconfigured or bypassed. Data protection ensures that even if unauthorized access occurs, the data remains unusable or non-identifying, protecting your organization from data breaches, compliance violations, and competitive intelligence loss.

### 4.1. Pattern: Encryptor

Even though you run your infrastructure on the cloud, the data is still physically stored somewhere, and unauthorized people may try to read it. If you need to reduce the access risk, you can first implement access policies, and then make sure the data will be unusable if access controls get compromised.

#### Quick Reference

| | |
|---|---|
| **What it is** | Encryptor encrypts stored data with client-side or server-side approaches and secures network communications with TLS/SSL protocols. |
| **When to use** | ✓ Need to secure data at rest and in transit ✓ Worried about physical data theft or network interception ✓ Want defense in depth protection |
| **Core problem** | Each writing and reading request puts extra pressure on CPU for encryption/decryption overhead. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Server-Side Encryption | Cloud providers manage encryption with KMS/Key Vault |
| Client-Side Encryption | Producer manages encryption keys before sending to storage |
| Data in Transit (TLS) | Enable secure communication between clients and data stores |

> 📁 **Full code**: [chapter-07/03-data-protection](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/03-data-protection)

---

#### 4.1.1. Problem

After implementing fine-grained access policies for both your tables and cloud resources, you're tasked with enforcing the security of your data at rest and in transit. Your stakeholders are worried that an unauthorized person could intercept the data transferred between your streaming brokers and jobs, or that the same person could physically steal your data from the servers.

#### 4.1.2. Solution

One way to reduce this data intrusion risk is with the Encryptor pattern. As there are two protection levels required, the pattern has two implementations.

**In plain English:** Encryption is like writing in a secret code that only people with the special decoder ring can read—even if someone steals your messages, they're just gibberish without the decoder.

**In technical terms:** The Encryptor pattern implements two encryption layers: data at rest (encrypting stored data with client-side or server-side approaches using KMS or Key Vault services) and data in transit (securing network communications with TLS/SSL protocols).

**Why it matters:** Without encryption, anyone who gains physical access to storage media or intercepts network traffic can read your data in plain text, leading to massive data breaches and compliance violations. Encryption provides the last line of defense.

<StackDiagram
  title="Encryption Layers"
  layers={[
    {
      label: "Data in Transit",
      color: colors.blue,
      items: ["TLS 1.2+", "HTTPS", "Secure protocols"]
    },
    {
      label: "Application Layer",
      color: colors.purple,
      items: ["Business logic", "Data processing"]
    },
    {
      label: "Data at Rest",
      color: colors.green,
      items: ["Server-side encryption", "Client-side encryption", "Key management"]
    }
  ]}
/>

##### Data at Rest Encryption

There are two approaches to encrypting stored data:

<ComparisonTable
  beforeTitle="Client-Side Encryption"
  afterTitle="Server-Side Encryption"
  beforeColor={colors.blue}
  afterColor={colors.green}
  items={[
    {
      label: "Key Management",
      before: "Producer manages keys",
      after: "Server manages keys"
    },
    {
      label: "Encryption Location",
      before: "Before sending to storage",
      after: "On server side"
    },
    {
      label: "Complexity",
      before: "Higher - manual key mgmt",
      after: "Lower - automated by provider"
    },
    {
      label: "Control",
      before: "Full control",
      after: "Delegated to provider"
    }
  ]}
/>

Server-side encryption is widely supported by public cloud providers. Each major provider has its own encryption keys store that you can apply to all offered services supporting server-side encryption:

- **AWS & GCP:** Key Management Service (KMS)
- **Azure:** Key Vault service

<DiagramContainer title="Server-Side Encryption Workflow">
  <ProcessFlow
    direction="horizontal"
    steps={[
      {
        title: "Request Data",
        description: "Client requests encrypted data from store",
        icon: "1",
        color: colors.blue
      },
      {
        title: "Request Key",
        description: "Store asks KMS for decryption key",
        icon: "2",
        color: colors.purple
      },
      {
        title: "Decrypt Data",
        description: "Store decrypts data with key",
        icon: "3",
        color: colors.green
      },
      {
        title: "Return Data",
        description: "Decrypted data sent to client",
        icon: "4",
        color: colors.orange
      }
    ]}
  />
</DiagramContainer>

If you're a cloud user, this complex exchange is fully abstracted by the cloud provider. Your only responsibility is to configure an appropriate encryption strategy for the data store and manage access to the data store and encryption key store for all reading and writing clients.

##### Data in Transit Encryption

Data in transit concerns the place where clients and data stores exchange data across the network. The implementation on the cloud is relatively easy as it's limited to:

1. Enabling secure communication at the SDK level on the client side
2. Configuring the required protocol version on the service

That way, the exchanged data will remain encrypted.

#### 4.1.3. Consequences

Encryption is a data access security strategy applied to the physical data storage level. Like other security protections, you can't get it for free.

**Encryption/decryption overhead:** CPU overhead is probably the first consequence that comes to mind. The data is not stored in plain text but in an altered, unreadable version. Without encryption and decryption action, it's unusable. For that reason, each writing and reading request puts extra pressure on the CPU.

**Data loss risk:** Even though the Encryptor pattern protects data at rest against unauthorized access, it can also, as a side effect, block access for authorized users. This can happen only if you either lose the encryption key or simply lose access to it.

To mitigate the issue, cloud providers often implement soft deletes on encryption stores. Any delete request you send will not take immediate effect. Instead, it benefits from a grace period during which you can restore the key in case of accidental deletion.

**Protocol updates:** Encryption in transit is much easier to set up than encryption at rest. However, it's still an extra component in your system that must be kept up-to-date. That's the case with the Transport Layer Security (TLS) protocol. Over the years, various security issues have been detected that led to the deprecation of TLS 1.0 and 1.1 versions. For that reason, any services using these old releases must be upgraded.

This operation looks like a difficult extra maintenance task, but with cloud offerings, it's very often simplified and reduced to upgrading the new encryption protocol version at the service level.

#### 4.1.4. Examples

Let's see encryption at rest in action for the AWS S3 object store with Terraform code. The encryption configuration has two main implementation steps. First, define the encryption key in the AWS KMS service and grant an AWS Lambda user decryption and encryption permissions:

```hcl
module "kms" {
  source    = "terraform-aws-modules/kms/aws"
  key_usage = "ENCRYPT_DECRYPT"
  deletion_window_in_days = 14
  aliases = ["visits-bucket-encryption-key"]
  grants = {
    lambda_doc_convert = {
      grantee_principal = aws_iam_role.iam_key_reader.arn
      operations        = ["Encrypt", "Decrypt", "GenerateDataKey"]
    }
  }
}
```

An AWS KMS key declaration is pretty self-explanatory. The only mysterious but essential parameter is `deletion_window_in_days`. This property ensures an encryption key restore window in case of erroneous removal. The declaration also assigns grants to other services—in our example, the grant applies to an IAM role you can later associate with a compute or querying service.

After defining the encryption key, the next step is to combine it with an S3 bucket:

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "visits" {
  bucket = aws_s3_bucket.visits.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = module.kms.key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}
```

To sum up: encryption is just a matter of associating the key with the encrypted resource and all authorized identities.

Additionally, you can enforce encryption in motion for some data stores and ensure that any client applications using older versions will be ignored. For the Azure Event Hubs streaming broker, you can define a minimum TLS version:

```hcl
resource "azurerm_eventhub_namespace" "visits" {
  name                = "visits-namespace"
  location            = azurerm_resource_group.dedp.location
  resource_group_name = azurerm_resource_group.dedp.name
  sku                 = "Standard"
  capacity            = 2
  minimum_tls_version = "1.2"
}
```

---

### 4.2. Pattern: Anonymizer

As you saw in Chapter 6, you can improve the value of a dataset if you share it with other pipelines. However, it's not always that simple. If your dataset contains PII attributes and the user hasn't agreed to share those details with your partners, you will need to perform a special preparation step before sharing the dataset.

#### Quick Reference

| | |
|---|---|
| **What it is** | Anonymizer removes or alters sensitive attributes to transform each row into anonymous information so that data consumers cannot identify users. |
| **When to use** | ✓ Sharing dataset with third parties ✓ Users didn't agree to share PII with partners ✓ Need to comply with privacy regulations |
| **Core problem** | When you remove or replace information your dataset becomes something new causing information loss for analysts and data scientists. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Data Removal | Simplest implementation - remove sensitive columns entirely |
| Data Perturbation | Add noise to values to alter original meaning |
| Synthetic Data Replacement | ML-generated values that maintain type but change value |

> 📁 **Full code**: [chapter-07/03-data-protection](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/03-data-protection)

---

#### 4.2.1. Problem

Your organization contracted an external data analytics company to analyze your customers' behavior and optimize your communication strategy. Since the dataset contains many PII attributes and some of your users didn't agree to share them with third parties, your data engineering team was tasked to write a pipeline to make the shared dataset compliant with privacy regulations.

> **Note**
>
> The examples refer to PII data as it's probably the most commonly discussed use case, but it's not the only data type requiring protection. Other examples are protected health information (PHI) and intellectual property (IP) data. In the following pages, we're going to stick to PII for the sake of simplicity.

#### 4.2.2. Solution

The problem states that some parts of your dataset cannot be shared. Put differently, you need to remove or transform them. That's the perfect task for the Anonymizer pattern.

**In plain English:** Anonymization is like redacting a document before sharing it—you black out all the parts that could identify someone, so readers can learn from the content without knowing who it's about.

**In technical terms:** The Anonymizer pattern removes or alters sensitive attributes to transform each row into anonymous information so that data consumers cannot identify users. It supports three implementations: data removal, data perturbation, and synthetic data replacement.

**Why it matters:** Sharing unanonymized data with third parties violates privacy regulations and user trust. Anonymization enables valuable data sharing and collaboration while protecting individual privacy and maintaining regulatory compliance.

<CardGrid
  columns={3}
  cards={[
    {
      title: "Data Removal",
      icon: "🗑️",
      color: colors.red,
      items: [
        "Simplest implementation",
        "Remove sensitive columns",
        "No transformation needed",
        "Complete information loss"
      ]
    },
    {
      title: "Data Perturbation",
      icon: "🔀",
      color: colors.orange,
      items: [
        "Add noise to values",
        "Alter original meaning",
        "Example: '123.456.789' → '1823.456.7809'",
        "Partial utility preserved"
      ]
    },
    {
      title: "Synthetic Replacement",
      icon: "🤖",
      color: colors.purple,
      items: [
        "ML-generated values",
        "Same type, different value",
        "Example: 'Portugal' → 'Croatia'",
        "Best utility preservation"
      ]
    }
  ]}
/>

The goal of this pattern is to remove sensitive data from the dataset, thereby transforming each row into anonymous information. Thanks to this process, the data consumer won't be able to identify the user.

##### Implementation Methods

**Data removal** is the easiest to implement as it takes selected columns out of the input dataset.

**Data perturbation** is more complex. It adds noise to the input value so that the value has a different meaning. For example, in an IP column, you could add extra attributes in random positions, so that "123.456.789.012" becomes "1823.456.7809.012".

**Synthetic data replacement** substitutes original values with values coming from a synthetic data generator. A smart model (probably a machine learning model) is capable of interpreting the type of input column and generating a corresponding replacement. The replacement looks the same as the original attribute but has a different value. For example, in a country column, "Portugal" could be synthetically replaced with "Croatia."

The easiest methods to implement are the first two. You can use either a mapping function or column transformation to remove the value or perturb it. The synthetic data method may involve work with the data science team to build a model capable of analyzing and generating replacement values. In a less ideal version, you could implement the solution on your own by creating a replacement function for each column that generates random values.

#### 4.2.3. Consequences

The Anonymizer pattern does protect your sensitive data, but it greatly impacts the data's usability.

**Information loss:** It's clear that when you remove or replace information, your dataset becomes something new. This means end users, including technical users like data analysts and data scientists, won't be able to rely on these sensitive columns in their work. That can lead to many issues, including false data prediction models and incorrect data insights.

<ComparisonTable
  beforeTitle="Original Dataset"
  afterTitle="Anonymized Dataset"
  beforeColor={colors.blue}
  afterColor={colors.red}
  items={[
    {
      label: "User Identity",
      before: "Identifiable",
      after: "Not identifiable"
    },
    {
      label: "Data Utility",
      before: "Full utility",
      after: "Reduced utility"
    },
    {
      label: "Analysis Capability",
      before: "All analyses possible",
      after: "Limited analyses"
    },
    {
      label: "Privacy Protection",
      before: "Vulnerable",
      after: "Protected"
    }
  ]}
/>

#### 4.2.4. Examples

Let's see how to anonymize a dataset by removing a birthday column and replacing an email address with a lower-quality version of synthetic data. The pipeline leverages the Apache Spark API for the former task and the Faker Python library for the latter.

To start, you can remove a column two different ways. First, you can omit it from the list of columns to read in the SELECT statement. This approach is good if you don't have many columns to read. If that's not the case, you can take the opposite approach and remove columns with the drop function.

Next, to replace a value, you can use a column-based function such as `withColumn` or a row-based function like `mapInPandas`. Since our example only involves replacing one column, we're going to use the former approach:

```python
@pandas_udf(StringType())
def replace_email(emails: pandas.Series) -> pandas.Series:
    faker_generator = Faker()
    return emails.apply(lambda email: faker_generator.email())

users.drop('birthday').withColumn('email', replace_email(users.email))
```

As a result, the output dataset doesn't contain the birthday column and has the email value replaced by a randomly generated email address.

---

### 4.3. Pattern: Pseudo-Anonymizer

The Anonymizer pattern offers strong data protection. However, the pattern's impact on data science and data analytics pipelines can be very bad because of missing or altered values. The Pseudo-Anonymizer pattern reduces this impact.

#### Quick Reference

| | |
|---|---|
| **What it is** | Pseudo-Anonymizer replaces sensitive data with related but non-identifying values through data masking, tokenization, hashing, or encryption. |
| **When to use** | ✓ Need to hide real PII values but keep business meaning ✓ Data consumers require more usable form than full anonymization ✓ Want to balance utility and privacy |
| **Core problem** | Pseudo-anonymized PII data can become identifiable if combined with other datasets providing weaker security guarantee than full anonymization. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| Data Masking | Replace with meaningless characters (XXX-XX-1040) |
| Data Tokenization | Fictive values with mapping stored in secure token vault |
| Hashing | Irreversible replacement with SHA-256 or similar algorithms |
| Encryption | Reversible with encryption keys for authorized users |

> 📁 **Full code**: [chapter-07/03-data-protection](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/03-data-protection)

---

#### 4.3.1. Problem

An anonymized dataset you shared with the external data analysts' company doesn't contain all the columns. You chose to remove them because that was the simplest data anonymization strategy. However, because of that, the team can't answer most of the business queries. The team members asked you to provide them with a new dataset that still hides real PII values but replaces them with a more usable form.

#### 4.3.2. Solution

Data sharing, PII data, and the requirement to keep some business meaning are perfect conditions in which to apply the Pseudo-Anonymizer pattern.

**In plain English:** Pseudo-anonymization is like replacing real names with consistent nicknames—everyone called "John Smith" always becomes "User123," so you can still track patterns without revealing real identities.

**In technical terms:** The Pseudo-Anonymizer pattern replaces sensitive data with related but non-identifying values through data masking, tokenization, hashing, or encryption, preserving data utility for analytics while protecting individual privacy.

**Why it matters:** While anonymization protects privacy, it often destroys too much utility for meaningful analysis. Pseudo-anonymization strikes a balance, enabling analytics, machine learning, and business intelligence while protecting sensitive information.

<TreeDiagram
  root={{
    label: "Pseudo-Anonymizer Methods",
    color: colors.blue,
    children: [
      {
        label: "Data Masking",
        color: colors.purple,
        children: [
          { label: "XXX-XX-1040", color: colors.cyan },
          { label: "Partial visibility", color: colors.cyan }
        ]
      },
      {
        label: "Tokenization",
        color: colors.green,
        children: [
          { label: "Token vault storage", color: colors.orange },
          { label: "Reversible mapping", color: colors.orange }
        ]
      },
      {
        label: "Hashing",
        color: colors.red,
        children: [
          { label: "SHA-256", color: colors.pink },
          { label: "Irreversible", color: colors.pink }
        ]
      },
      {
        label: "Encryption",
        color: colors.blue,
        children: [
          { label: "Key-based", color: colors.slate },
          { label: "Reversible with key", color: colors.slate }
        ]
      }
    ]
  }}
/>

Depending on your context, you can use one of four implementations:

**Data masking** replaces sensitive data with meaningless characters or more realistic substitution values. For example, a Social Security number (SSN) like 999-55-1040 could be masked as XXX-XX-1040 or 9XX-5X-1XXX. Several different users may share the same masked SSN.

**Data tokenization** substitutes initial values with fictive ones. However, it stores the mapping between original values and substitutes in a token vault store. The key is to secure access to the vault to avoid compromising the protected attributes. If vault access security is compromised, an unauthorized person could access and thus reverse the tokenized values.

**Hashing** fully and irreversibly replaces sensitive values. For example, an email like contact@waitingforcode.com could become a string like gD0B+pUpXYVZ9nqhgLRuban0CilZRKVp4dcmvmocsYE= if hashed with an SHA-256 algorithm and encoded with a Base64 scheme.

**Encryption** relies on encryption keys applied to columns or rows, a little bit like the keys for the datasets in the Encryptor pattern. Here, a user with access to the encryption key should be able to restore the original value.

Once you've identified the method that fits best with the data types of your dataset, you can proceed to implement the anonymization functions. Some, such as data masking, can be represented as easy column transformation functions. Others, such as tokenization that requires an extra mapping table, might need additional implementation effort.

> **Warning: Anonymization Versus Pseudo-Anonymization**
>
> The pseudo-anonymization techniques described in this pattern are sometimes presented as part of the anonymization process. However, there is an important difference between them. Pseudo-anonymized PII data can become identifiable if combined with other datasets. That's not the case with anonymized datasets, where even in cases of combinations, the data will remain unidentifiable.

#### 4.3.3. Consequences

The Pseudo-Anonymizer pattern, despite protecting personal data, doesn't provide as strong a protection guarantee as the Anonymizer pattern.

**False sense of security:** The Pseudo-Anonymizer, even though it blurs personal data, provides a weaker security guarantee than the Anonymizer pattern. One of the biggest issues comes from the combination of datasets, in which a pseudo-anonymized column can become a PII column identifying a person.

Let's look at an example. Your database has two pseudo-anonymized tables. The first stores user food preferences, and the second persists user registration information:

<DiagramContainer title="Dataset Combination Risk">
  <Column gap="md">
    <Group title="Table 1: Food Preferences" color={colors.green} direction="column">
      <Box color={colors.green} variant="outlined" size="sm">
        User 1000: likes carrot, broccoli, potato
      </Box>
    </Group>
    <Box color={colors.slate} variant="subtle" size="sm">
      + (combined with)
    </Box>
    <Group title="Table 2: Registration" color={colors.purple} direction="column">
      <Box color={colors.purple} variant="outlined" size="sm">
        User 1000: S*n M****o, C******h P*******r i******r
      </Box>
    </Group>
    <Arrow direction="down" label="reveals identity" />
    <Box color={colors.red} variant="filled" size="lg" icon="⚠️">
      "Cheetach Processor inventor living in San Marino likes carrot..."
    </Box>
  </Column>
</DiagramContainer>

As you can see, Table 1 perfectly protects the identity of the user. However, if you combine it with Table 2, you get something like "C******h P*******r i******r living in S*n M****o likes carrot, broccoli, and potato." There are not many countries whose names match the one in the masked country column. Once you get to San Marino, you may also discover the "inventor" part and identify that user ID 1000 refers to our famous John Doe.

Identification wouldn't be possible with full anonymization because the Country and Role columns would both be removed or altered to, for example, "Europe" and "Software engineer." Even after combining both tables, it wouldn't be clear who this software engineer is.

**Information loss:** The best example illustrating this is the data masking strategy. As you saw in our previous example with the SSN, some numbers are preserved. Because of that, two different SSNs can now point to the same user. For example, numbers like 999-55-1040 and 999-13-1040 can both be masked in the same format: XXX-XX-1040.

Besides this loss, there is also a data type loss. A great example is the generalization method, in which a numeric value can be replaced by a numeric range represented by a text type.

#### 4.3.4. Examples

Implementing the Pseudo-Anonymizer pattern relies on using the mapping function. In our example, let's see how to do this with PySpark's `mapInPandas` and column transformations working on this table:

```
+-------+-------+--------------+------+
|user_id|country|           ssn|salary|
+-------+-------+--------------+------+
|      1| Poland|0940-0000-1000| 50000|
|      2| France|0469-0930-1000| 60000|
|      3|the USA|1230-0000-3940| 80000|
|      4|  Spain|8502-1095-9303| 52000|
+-------+-------+--------------+------+
```

All but the first column should be pseudo-anonymized. We're going to use two different methods. The first is the `mapInPandas` function that replaces the country value with a geographical area and masks the SSN:

```python
def pseudo_anonymize_users(input_pandas: pandas.DataFrame) -> pandas.DataFrame:
    def pseudo_anonymize_country(country: str) -> str:
        countries_area_mapping = {
            'Poland': 'eu', 'France': 'eu', 'Spain': 'eu', 'the USA': 'na'
        }
        return countries_area_mapping[country]

    def pseudo_anonymize_ssn(ssn: str) -> str:
        return f'{ssn[0]}***-{ssn[5]}***-{ssn[10]}***'

    for rows in input_pandas:
        rows['country'] = rows['country'].apply(lambda c: pseudo_anonymize_country(c))
        rows['ssn'] = rows['ssn'].apply(lambda ssn: pseudo_anonymize_ssn(ssn))
        yield rows
```

The `mapInPandas` mapping doesn't include the range transformation for the salary column because of the type change. The salary is defined as an integer in the input dataset, while the range is of the string type. It's a types-incompatible conversion, and to handle it, we need a simple column-based mapping:

```python
pseud_anonymized_users = (users.mapInPandas(pseudo_anonymize_users, users.schema)
    .withColumn('salary', functions.expr('''
        CASE WHEN salary BETWEEN 0 AND 50000 THEN "0-50000"
             WHEN salary BETWEEN 50000 AND 60000 THEN "50000-60000"
             ELSE "60000+" END''')))
```

After applying both types of transformations, the input dataset changes to:

```
+-------+-------+--------------+-----------+
|user_id|country|           ssn|     salary|
+-------+-------+--------------+-----------+
|      1|     eu|0***-0***-1***|    0-50000|
|      2|     eu|0***-0***-1***|50000-60000|
|      3|     na|1***-0***-3***|     60000+|
|      4|     eu|8***-1***-9***|50000-60000|
+-------+-------+--------------+-----------+
```

---

## 5. Connectivity

So far, you have learned how to protect your data. Although this is the core part of data security, it might not be enough. Data is continuously flowing within the same system or across different systems, and you will need to access it. In this section, you'll learn about secure access strategies.

**In plain English:** Connectivity security is about protecting the keys to your house—making sure they don't end up in the wrong hands while still allowing authorized people to get in.

**In technical terms:** Connectivity patterns implement secure credential management through external secrets stores (avoiding hardcoded credentials) or credentialless authentication (eliminating credentials entirely through identity-based access or certificates).

**Why it matters:** Hardcoded credentials in code repositories are one of the most common causes of data breaches. Secure connectivity patterns prevent credential leakage while enabling authorized access to data systems.

### 5.1. Pattern: Secrets Pointer

The login/password authentication method is still probably the most commonly used to access databases. It's simple but also dangerous if used without precautions, and the pattern presented next is one of the precautions you can apply.

#### Quick Reference

| | |
|---|---|
| **What it is** | Secrets Pointer leverages secrets manager services to store sensitive values centrally where consumers reference secrets by name rather than value. |
| **When to use** | ✓ Want to avoid storing credentials in code or Git ✓ Need centralized credential management ✓ Require access monitoring and rotation capability |
| **Core problem** | If you cache credentials you'll never know whether you're using the most up-to-date ones which may lead to connection issues. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| AWS Secrets Manager | Using AWS cloud services for secret storage |
| Google Cloud Secret Manager | Using GCP cloud services for secret storage |
| Azure Key Vault | Using Azure cloud services for secret storage |

> 📁 **Full code**: [chapter-07/04-connectivity](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/04-connectivity)

---

#### 5.1.1. Problem

The visits real-time processing pipeline from our use case leverages an external API to enrich each event with geolocation information. This API is provided by an external company, and the only authentication method is a login/password pair.

In the past, your team accidentally shared the login/password used for a different API. As the API was request-billed, the leak led to increased billing. You want to reduce this risk right now and avoid storing the login/password for the code interacting with the new data enrichment API.

#### 5.1.2. Solution

Credentials are sensitive parameters. One of the best ways to secure them is to...avoid storing them anywhere. Instead, you can use a reference (aka a pointer). That's what the Secrets Pointer pattern does.

**In plain English:** Instead of writing your password on a sticky note in your code, you write "get password from vault" and keep the actual password in a secure, centralized vault that only authorized people can access.

**In technical terms:** The Secrets Pointer pattern leverages secrets manager services (Google Cloud Secret Manager, AWS Secrets Manager) to store sensitive values centrally. Consumers reference secrets by name rather than value, retrieving actual credentials at runtime through secure API calls with optional local caching.

**Why it matters:** Hardcoded credentials in Git repositories lead to credential leakage, unauthorized access, and expensive security incidents. Centralized secrets management enables credential rotation, access monitoring, and eliminates the risk of accidentally committing secrets to version control.

<DiagramContainer title="Secrets Pointer Architecture">
  <Column gap="lg">
    <Row gap="lg">
      <Box color={colors.blue} variant="filled" size="md" icon="📝">
        Application Code
      </Box>
      <Box color={colors.green} variant="outlined" size="sm">
        Reference: "db_password"
      </Box>
    </Row>
    <Arrow direction="down" label="runtime retrieval" />
    <Box color={colors.purple} variant="filled" size="lg" icon="🔐">
      Secrets Manager
    </Box>
    <Box color={colors.orange} variant="outlined" size="sm">
      Actual Value: "supersecret123"
    </Box>
    <Arrow direction="down" label="authenticated connection" />
    <Box color={colors.cyan} variant="filled" size="md" icon="🗄️">
      Database / API
    </Box>
  </Column>
</DiagramContainer>

The idea here is to leverage a secrets manager service where you store all sensitive values, such as logins, passwords, and API keys. This approach has several advantages:

**Centralization:** It's a central place where you manage sensitive data. Thanks to this centralization, access monitoring is easier.

**Simplified management:** The component facilitates management. You can simply set a new set of credentials without having to update all the consumers.

Regarding the consumers, they won't reference the sensitive parameter values anymore. Instead, they'll use their names from the secrets manager service. Consequently, each consumer will retrieve the secret's value by issuing a query to the service at runtime. Additionally, to save communication costs, consumers can store credentials in their local cache for some time.

With the Secrets Pointer pattern, access is protected on two levels:

1. **Secrets manager access:** The consumer must have access to the secrets manager. Otherwise, it won't be able to retrieve the key. Secure this step using one of the fine-grained access patterns.
2. **Credential validation:** Natively guaranteed by the credentials themselves. If they're not valid, a consumer will simply not have access to the underlying API or database.

#### 5.1.3. Consequences

A popular proverb in our engineering world came from Phil Karlton: "There are only two hard things in computer science: cache invalidation and naming things." The cache part applies to the Secrets Pointer too.

**Cache invalidation and streaming jobs:** If you cache credentials, you'll never know whether you're using the most up-to-date ones, which may lead to connection issues. On the other hand, you may potentially avoid many credentials retrieval requests and hence optimize execution time if they're costly.

The simplest approach here, if you don't want to send a credentials refresh request, is to simply allow the job to fail. Normally, once restarted, the new execution version should reload credentials from the secrets manager. That said, this might not be optimal if credentials change very often, as it would increase the number of failures. Also, remember to use one of the idempotency design patterns as they should keep your data correct even with retries.

You can also try to write an asynchronous refresh process, but here too, you may encounter writing issues if credentials change after you've started sending data to the output data store and before you refresh the connection parameters.

**Logs:** The Secrets Pointer pattern gives you a false sense of security that credentials won't leak. Indeed, they're now stored in a secured place that only authorized entities can access. Even though this part doesn't get compromised, you can still leak secrets if you inadvertently include them in the logs.

**A secret remains secret:** Even though consumers don't need to deal with credentials, it doesn't mean there are no credentials at all. In fact, to enable consumers to use references instead of secret values, there is a secrets producer that needs to securely generate secret values to the secrets storage. In practice, this is either a human administrator who puts the secret values in storage or the IaC stack that defines random secret values while creating a database.

#### 5.1.4. Examples

To see how to integrate the Secrets Pointer pattern into a pipeline, let's look at a simple Apache Spark job reading a PostgreSQL table and converting it to JSON files. Normally, the input dataset definition requires several parameters, including the login/password pair. However, as we're going to use the pattern, instead of clear values, we're going to define references:

```python
secretsmanager_client = boto3.client('secretsmanager')
db_user = secretsmanager_client.get_secret_value(SecretId='user')['SecretString']
db_password = secretsmanager_client.get_secret_value(SecretId='pwd')['SecretString']

spark_session.read.option('driver', 'org.postgresql.Driver').jdbc(
    url='jdbc:postgresql:dedp',
    table='dedp.devices',
    properties={'user': db_user, 'password': db_password}
)
```

Although the connection configuration still references the user and password, the code doesn't know about the values. Well, technically, it knows them, but only thanks to the secrets manager data store. Put differently, the credentials aren't tied to the codebase but are managed as a separate asset.

> **Insight**
>
> Besides keeping secrets secret, the Secrets Pointer pattern simplifies work on multiple environments. If you create the database with its connection attributes from a scripted project like IaC with Terraform, you can keep the same secret names for all environments and let the IaC automate their generation. That way, your code doesn't need to deal with any per-environment configuration files that would store different connection parameters for each environment.

---

### 5.2. Pattern: Secretless Connector

The Secrets Pointer pattern shows how to secure credentials, but what if I told you that it's even better to not have any credentials to manage? That is what the next pattern makes possible.

#### Quick Reference

| | |
|---|---|
| **What it is** | Secretless Connector eliminates credential management through IAM-based identity verification or certificate-based authentication. |
| **When to use** | ✓ Working with cloud services ✓ Want to avoid managing API keys ✓ Need access without credentials in code |
| **Core problem** | Although there are no credentials involved there is still work to configure the entity to leverage credentialless access. |

**Solutions at a glance:**

| Approach | Use when |
|----------|----------|
| IAM-Based Access | Cloud services validate permissions through identity services |
| Certificate-Based Authentication | Certificate authority validates certificates during connection |

> 📁 **Full code**: [chapter-07/04-connectivity](https://github.com/bartosz25/data-engineering-design-patterns-book/tree/master/chapter-07/04-connectivity)

---

#### 5.2.1. Problem

One of the teams in your organization has started integrating a new data processing service. All the code examples it found use API keys to interact with the cloud-managed resources available from the service.

The team is small and would like to avoid managing these APIs. It called you for the second time to see if you have an alternative solution, ideally guaranteeing access to resources without any kind of credentials to reference in the code.

#### 5.2.2. Solution

If you work with cloud services and don't want to manage credentials, you can implement the Secretless Connector pattern. There are two main approaches.

**In plain English:** It's like using a keycard system where the building knows who you are when you walk in—you don't need to carry actual keys, the system recognizes you and grants access based on who you are.

**In technical terms:** The Secretless Connector pattern eliminates credential management through IAM-based identity verification (where services validate permissions through identity services before granting access) or certificate-based authentication (where certificate authorities validate certificates during connection).

**Why it matters:** Managing, rotating, and securing credentials is complex, error-prone, and creates security vulnerabilities. Secretless authentication eliminates these risks entirely while simplifying operations and reducing the attack surface for credential theft.

<DiagramContainer title="IAM-Based Credentialless Access">
  <ProcessFlow
    direction="vertical"
    steps={[
      {
        title: "Request Resource",
        description: "Application user issues request to cloud service",
        icon: "1",
        color: colors.blue
      },
      {
        title: "Validate Permissions",
        description: "Service connects to IAM to validate user permissions",
        icon: "2",
        color: colors.purple
      },
      {
        title: "Return Permission Scope",
        description: "IAM responds with list of permissions for the user",
        icon: "3",
        color: colors.green
      },
      {
        title: "Grant or Deny",
        description: "Service returns data if authorized, error otherwise",
        icon: "4",
        color: colors.orange
      }
    ]}
  />
</DiagramContainer>

##### IAM-Based Implementation

The first implementation uses the IAM service available on your cloud provider. Here, a user or administrator assigns reading and writing actions to each user, group, or role via document access policy. This IAM-based policy approach applies to application users, such as data processing jobs. They may work on the same cloud resources as you, a human user, but their interaction is automated. For example, their job may be scheduled to run at specific times of day. Therefore, they don't log in but must somehow be authorized to access cloud resources.

The workflow for IAM-based access for both physical and application users involves:

1. Application user issues a request to interact with a cloud service
2. The service connects to the IAM service to validate permissions
3. The IAM responds with the list of permissions' scope
4. The service returns a response (data if authorized, error otherwise)

##### Certificate-Based Implementation

The second implementation uses certificates and is also known as certificate-based authentication. The workflow is similar to IAM-based access, but instead of the IAM service, there is a certificate authority (CA) component. This authority validates certificates used in the connection process before authorizing the workflow to move on.

#### 5.2.3. Consequences

Despite the -less suffix that might indicate a lack of effort, the Secretless Connector pattern does require some work.

**Workless impression:** Although there are no credentials involved, there is still some work to do. You have to configure the entity to leverage the credentialless access. For example, on AWS, this requires setting an assume role permission that lets an entity use temporary credentials returned by the Security Token Service (STS) to interact with other services.

**Rotation:** This point is essentially valid for certificate-based authentication. Rotating access keys on a regular basis is often considered a security best practice to reduce the risk of leaks. However, with certificates, logins, and passwords, it adds extra management overhead.

To rotate them without impacting your consumers, you have to first generate and share new credentials with consumers. Meanwhile, you need to support both old and new credentials on your side, so that consumers who may not migrate at the same time can still use your data store. Only once the consumers confirm they're using the new credentials can you drop the old ones.

#### 5.2.4. Examples

Let's begin this section with a certificate-based connection to PostgreSQL from an Apache Spark job. As shown below, the connection attributes don't require any password. Instead, they rely on the certificate shared with the server:

```python
input_data = spark.read.option('driver', 'org.postgresql.Driver').jdbc(
    url='jdbc:postgresql:dedp',
    table='dedp.devices',
    properties={
        'ssl': 'true',
        'sslmode': 'verify-full',
        'user': 'dedp_test',
        'sslrootcert': 'dataset/certs/ssl-cert-snakeoil.pem',
    }
)
```

The connection parameters use the `verify-full` SSL mode that ensures the server host name matches the name stored in the server certificate.

To help you understand the cloud component better, let's change the cloud provider and see what a GCP Dataflow job needs to process objects from a GCS object store. First, we need to create a Service Account resource, which is a GCP term for the application user:

```hcl
resource "google_service_account" "visits_job_sa" {
  account_id = "dedp"
  display_name = "Dataflow SA for processing visits from GCS"
}
```

The next step consists of linking this Service Account to the GCS bucket the Dataflow job should process and the job itself:

```hcl
resource "google_storage_bucket_iam_binding" "visits_access" {
  bucket = "visits"
  role   = "roles/storage.objectViewer"
  members = [
    "serviceAccount:${google_service_account.visits_job_sa.email}",
  ]
}

resource "google_dataflow_job" "visits_aggregator" {
  # ...
  service_account_email = google_service_account.visits_job_sa.email
}
```

This way, the visits_aggregator job gets an identity, and consequently, it doesn't need any credentials provided at runtime to read the visits bucket.

---

## 6. Summary

In this chapter, you learned about various aspects of data security. Let's recap the key patterns and their applications:

### 6.1. Key Takeaways

<CardGrid
  columns={2}
  cards={[
    {
      title: "Data Removal",
      icon: "🗑️",
      color: colors.red,
      items: [
        "Vertical Partitioner: Cheaper deletion through data organization",
        "In-Place Overwriter: Universal solution for legacy systems",
        "Comply with GDPR and CCPA",
        "Balance cost vs flexibility"
      ]
    },
    {
      title: "Access Control",
      icon: "🔐",
      color: colors.blue,
      items: [
        "Fine-Grained Accessor for Tables: Column and row-level security",
        "Fine-Grained Accessor for Resources: Cloud resource permissions",
        "Implement least privilege",
        "Prevent unauthorized access"
      ]
    },
    {
      title: "Data Protection",
      icon: "🛡️",
      color: colors.green,
      items: [
        "Encryptor: Protect data at rest and in transit",
        "Anonymizer: Remove identifying information",
        "Pseudo-Anonymizer: Balance utility and privacy",
        "Defense in depth"
      ]
    },
    {
      title: "Connectivity",
      icon: "🔌",
      color: colors.purple,
      items: [
        "Secrets Pointer: Centralized credential management",
        "Secretless Connector: Eliminate credentials entirely",
        "Prevent credential leakage",
        "Simplify operations"
      ]
    }
  ]}
/>

> **Insight**
>
> Data security is not a single pattern but a layered approach. Combine multiple patterns to create defense in depth: use fine-grained access control to limit who can access data, encryption to protect data even if access is breached, anonymization for sharing, and secretless connectivity to eliminate credential risks.

### 6.2. Pattern Selection Guide

<ComparisonTable
  beforeTitle="When to Use"
  afterTitle="Pattern Choice"
  beforeColor={colors.blue}
  afterColor={colors.green}
  items={[
    {
      label: "New project with control",
      before: "Full architectural freedom",
      after: "Vertical Partitioner"
    },
    {
      label: "Legacy system constraints",
      before: "Can't reorganize data",
      after: "In-Place Overwriter"
    },
    {
      label: "Sharing with full privacy",
      before: "No identity needed",
      after: "Anonymizer"
    },
    {
      label: "Sharing with analytics",
      before: "Need data utility",
      after: "Pseudo-Anonymizer"
    },
    {
      label: "Managing credentials",
      before: "Must use passwords",
      after: "Secrets Pointer"
    },
    {
      label: "Cloud-native services",
      before: "Can use identity",
      after: "Secretless Connector"
    }
  ]}
/>

Even though we're approaching the end of our journey with data security design patterns, three important topics still remain. The first of them is data storage, which, besides helping with data removal requests, also optimizes data access. It'll be the topic of the next chapter.

---

**Previous:** [Chapter 6: Data Flow Design Patterns](./chapter6) | **Next:** [Chapter 8: Data Storage Design Patterns](./chapter8)
