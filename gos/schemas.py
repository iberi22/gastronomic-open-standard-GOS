from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, validator

class Source(BaseModel):
    name: Optional[str] = None
    url: str

class Media(BaseModel):
    type: str = "image"
    url: str
    description: Optional[str] = None

class Macros(BaseModel):
    protein_g: float
    fat_g: float
    carbs_g: float

class Nutrition(BaseModel):
    calories: float
    macros: Macros

class SensoryProfile(BaseModel):
    flavor: List[str]
    texture: List[str]
    aroma: List[str]
    presentation: Optional[str] = None

class RecipeFrontmatter(BaseModel):
    title: str
    region: Optional[str] = None
    language: str = "es"
    license: str = "MIT"
    categories: List[str] = []
    tags: List[str] = []
    sensory: Optional[SensoryProfile] = None
    nutrition: Optional[Nutrition] = None
    main_ingredients: List[str] = []
    difficulty: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[int] = None
    sources: List[str | Source] = []
    images: List[Media] = []
    description: Optional[str] = None

    class Config:
        extra = "ignore" # Allow extra fields but valid ones must match
