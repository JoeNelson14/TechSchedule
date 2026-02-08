import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Define the data model for a fruit
class Fruit(BaseModel):
    name: str

#
class FruitList(BaseModel):
    fruits: List[Fruit]

# Create a FastAPI application instance
app = FastAPI()

# Define the allowed origins for CORS
origins = [
    "http://localhost"
]

# Set up CORS middleware to allow requests from the specified origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#temp data base
memory_db = {"fruits": []}

# Get the list of fruits
@app.get("/fruits", response_model=FruitList)
def get_fruits():
    return FruitList(fruits=memory_db["fruits"])

# Add a new fruit to the list
@app.post("/fruits")
def add_fruit(fruit: Fruit):
    memory_db["fruits"].append(fruit)
    return fruit


# Run the application
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)