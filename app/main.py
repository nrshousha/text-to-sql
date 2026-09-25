from fastapi import FastAPI
from pydantic import BaseModel
from app.llm import generate_sql
from app.db import execute_query
from app.query_safety import is_write_query

app = FastAPI()


class QuestionRequest(BaseModel):
    question: str


class ExecuteRequest(BaseModel):
    sql: str


@app.post("/ask")
def ask(request: QuestionRequest):
    sql = generate_sql(request.question)

    if is_write_query(sql):
        return {"requires_confirmation": True, "sql": sql}

    results = execute_query(sql)
    return {"requires_confirmation": False, "results": results}


@app.post("/execute")
def execute(request: ExecuteRequest):
    results = execute_query(request.sql)
    return {"results": results}