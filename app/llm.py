import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from app.schema_context import SCHEMA_CONTEXT

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

GENERATE_SQL_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_sql",
        "description": "Generate a SQL query to answer the user's question about the inventory database.",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "A single valid PostgreSQL query that answers the user's question."
                }
            },
            "required": ["sql"]
        }
    }
}


def generate_sql(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SCHEMA_CONTEXT},
            {"role": "user", "content": question}
        ],
        tools=[GENERATE_SQL_TOOL],
        tool_choice={"type": "function", "function": {"name": "generate_sql"}}
    )

    tool_call = response.choices[0].message.tool_calls[0]
    arguments = json.loads(tool_call.function.arguments)
    return arguments["sql"]