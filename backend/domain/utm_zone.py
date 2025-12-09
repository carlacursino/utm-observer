from typing import List
from pydantic import BaseModel
from domain.base import Volume4D


class UTMZone(BaseModel):
    name: str
    volumes: List[Volume4D]
