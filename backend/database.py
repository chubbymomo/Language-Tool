import os
import sys
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_DSN = os.getenv("DB_DSN")

# Initialize Connection Pool
connection_pool = None

def init_pool():
    """Initialize the database connection pool."""
    global connection_pool
    
    if not DB_DSN:
        print("⚠️  WARNING: DB_DSN not set. Database features will be unavailable.")
        return False
    
    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,
            dsn=DB_DSN
        )
        if connection_pool:
            print("✅ Database connection pool created successfully")
            return True
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"❌ Error connecting to PostgreSQL: {error}")
        print("   Database features will be unavailable.")
        return False

def get_db_connection():
    """Get a connection from the pool."""
    if connection_pool is None:
        raise Exception("Database connection pool not initialized. Check your DB_DSN.")
    return connection_pool.getconn()

def release_db_connection(conn):
    """Return a connection to the pool."""
    if connection_pool is not None and conn is not None:
        connection_pool.putconn(conn)

def is_db_available():
    """Check if database is available."""
    return connection_pool is not None

def init_db():
    """Initializes the database tables."""
    if not is_db_available():
        print("⚠️  Skipping database initialization - no connection available")
        return False
    
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = True
        with conn.cursor() as cur:
            # Create Vocab Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS vocab (
                    id TEXT PRIMARY KEY,
                    term TEXT NOT NULL,
                    reading TEXT,
                    meaning TEXT,
                    explanation TEXT,
                    examples TEXT, 
                    mastery INTEGER DEFAULT 1,
                    added_at BIGINT
                );
            """)
            # Create Sessions Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    data TEXT
                );
            """)
        print("✅ Database tables initialized")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False
    finally:
        if conn:
            release_db_connection(conn)

# Initialize pool on module load
init_pool()
