import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.llm import generate_sql
from app.db import execute_query
from app.query_safety import is_write_query, is_blocked_query, get_first_keyword

app = FastAPI(title="Text to SQL Inventory Intelligence")

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")


class QuestionRequest(BaseModel):
    question: str


class ExecuteRequest(BaseModel):
    sql: str


@app.get("/")
def get_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Text to SQL Backend API is active."}


@app.post("/ask")
def ask(request: QuestionRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    sql = generate_sql(request.question)

    if is_blocked_query(sql):
        return {
            "blocked": True,
            "requires_confirmation": False,
            "sql": sql,
            "keyword": get_first_keyword(sql),
            "message": f"Security Alert: Schema-modifying DDL operations ({get_first_keyword(sql)}) are blocked for safety."
        }

    if is_write_query(sql):
        return {
            "blocked": False,
            "requires_confirmation": True,
            "sql": sql,
            "keyword": get_first_keyword(sql),
            "message": f"Confirmation Required: This query performs a write operation ({get_first_keyword(sql)})."
        }

    results = execute_query(sql)
    return {
        "blocked": False,
        "requires_confirmation": False,
        "sql": sql,
        "keyword": "SELECT",
        "results": results
    }


@app.post("/execute")
def execute(request: ExecuteRequest):
    if not request.sql or not request.sql.strip():
        raise HTTPException(status_code=400, detail="SQL query cannot be empty.")

    if is_blocked_query(request.sql):
        return {
            "blocked": True,
            "success": False,
            "message": f"Security Alert: Direct execution of blocked DDL command ({get_first_keyword(request.sql)}) is rejected."
        }

    results = execute_query(request.sql)
    return {
        "blocked": False,
        "success": True,
        "sql": request.sql,
        "results": results
    }


@app.get("/api/stats")
def get_stats():
    try:
        total_products = execute_query("SELECT COUNT(*) as count FROM products;")[0]["count"]
        low_stock = execute_query("SELECT COUNT(*) as count FROM products WHERE quantity_on_hand <= reorder_threshold;")[0]["count"]
        total_suppliers = execute_query("SELECT COUNT(*) as count FROM suppliers;")[0]["count"]
        recent_shipments = execute_query("SELECT COUNT(*) as count FROM shipments;")[0]["count"]
        return {
            "status": "connected",
            "total_products": total_products,
            "low_stock": low_stock,
            "total_suppliers": total_suppliers,
            "recent_shipments": recent_shipments
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "total_products": 0,
            "low_stock": 0,
            "total_suppliers": 0,
            "recent_shipments": 0
        }