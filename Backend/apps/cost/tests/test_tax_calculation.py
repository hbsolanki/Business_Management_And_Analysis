import pytest
from decimal import Decimal
from apps.cost.utils.tax_calculation import calculate_tax_on_net_profit


class TestTaxCalculation:

    def test_calculate_tax_on_net_profit_none_or_negative(self):
        """Test with None, 0, or negative profits."""
        # Arrange, Act & Assert
        assert calculate_tax_on_net_profit(None) == Decimal("0.00")
        assert calculate_tax_on_net_profit(Decimal("0.00")) == Decimal("0.00")
        assert calculate_tax_on_net_profit(Decimal("-5000.00")) == Decimal("0.00")

    def test_calculate_tax_on_net_profit_slab_under_250k(self):
        """Test profit within 0% tax slab."""
        # Arrange
        sut_profit = Decimal("200000.00")

        # Act
        sut_tax = calculate_tax_on_net_profit(sut_profit)

        # Assert
        assert sut_tax == Decimal("0.00")

    def test_calculate_tax_on_net_profit_slab_between_250k_and_500k(self):
        """Test profit in 5% tax slab (250k to 500k)."""
        # Arrange (profit 350,000 -> 100k taxed at 5% = 5000 + 4% cess = 5200)
        sut_profit = Decimal("350000.00")

        # Act
        sut_tax = calculate_tax_on_net_profit(sut_profit)

        # Assert
        assert sut_tax == Decimal("5200.00")

    def test_calculate_tax_on_net_profit_slab_between_500k_and_1m(self):
        """Test profit in 20% tax slab (500k to 1M)."""
        # Arrange (profit 750,000 -> 250k@5% = 12500, 250k@20% = 50000, subtotal 62500 + 4% cess = 65000)
        sut_profit = Decimal("750000.00")

        # Act
        sut_tax = calculate_tax_on_net_profit(sut_profit)

        # Assert
        assert sut_tax == Decimal("65000.00")

    def test_calculate_tax_on_net_profit_slab_above_1m(self):
        """Test profit in highest 30% tax slab (>1M)."""
        # Arrange (profit 1,500,000 -> 250k@5%=12.5k, 500k@20%=100k, 500k@30%=150k. Total 262.5k + 4% cess = 273,000)
        sut_profit = Decimal("1500000.00")

        # Act
        sut_tax = calculate_tax_on_net_profit(sut_profit)

        # Assert
        assert sut_tax == Decimal("273000.00")
