# Neo4j Database Setup Instructions

## Create AutoIntelKG Database in Neo4j Desktop

The `AutoIntelKG` database needs to be created manually in Neo4j Desktop.

### Steps:

1. **Open Neo4j Desktop**
   - Launch Neo4j Desktop application
   - Ensure it's fully loaded

2. **Create New Database**
   - Click **"Add"** button (or **"Add Database"**)
   - Select **"Create a Local Database"**
   - Or click the **"+"** icon next to "Databases"

3. **Configure Database**
   - **Name:** `AutoIntelKG` (case-sensitive)
   - **Password:** `1IntelGTP!`
   - **Version:** Use latest available (5.x recommended)
   - Click **"Create"**

4. **Start Database**
   - Click **"Start"** button on the AutoIntelKG database
   - Wait for status to turn **green** (Running)
   - Should show "Active" status

5. **Verify Connection**
   - Click **"Open"** button to open Neo4j Browser
   - Should connect to: `bolt://localhost:7687`
   - Test with query: `RETURN 1 as test`
   - Should return: `[1]`

### Alternative: Use Default Database

If you prefer to use the default `neo4j` database:

1. Set environment variable:
   ```bash
   # Linux/Mac
   export NEO4J_DATABASE=neo4j
   
   # Windows PowerShell
   $env:NEO4J_DATABASE="neo4j"
   ```

2. The code will automatically use the default database if `AutoIntelKG` doesn't exist.

### Verify Database Exists

In Neo4j Browser (http://localhost:7474), run:
```cypher
SHOW DATABASES
```

You should see `AutoIntelKG` in the list.

---

**Once database is created, run:**
```bash
npx tsx src/scripts/temporal-kg-validation/populate-sample-data.ts
```



