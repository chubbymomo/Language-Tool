import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_DSN = os.getenv("DB_DSN")

# Initialize Connection Pool
# minconn=1, maxconn=20
try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20,
        dsn=DB_DSN
    )
    if connection_pool:
        print("✅ Database connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("❌ Error while connecting to PostgreSQL", error)

def get_db_connection():
    """Get a connection from the pool."""
    return connection_pool.getconn()

def release_db_connection(conn):
    """Return a connection to the pool."""
    connection_pool.putconn(conn)

def init_db():
    """Initializes the database tables."""
    conn = get_db_connection()
    conn.autocommit = True
    try:
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
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    finally:
        release_db_connection(conn)
