from django.db import models
from apps.base.models import BaseModel


class Country(BaseModel):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "bma_country"
        verbose_name_plural = "Countries"

    def __str__(self):
        return self.name


class State(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name="states"
    )

    class Meta:
        db_table = "bma_state"

    def __str__(self):
        return f"{self.name} ({self.country.name})"


class City(BaseModel):
    name = models.CharField(max_length=100)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="cities")

    class Meta:
        db_table = "bma_city"
        verbose_name_plural = "Cities"
        constraints = [
            models.UniqueConstraint(fields=["name", "state"], name="unique_city_state")
        ]

    def __str__(self):
        return f"{self.name}, {self.state.name}"
