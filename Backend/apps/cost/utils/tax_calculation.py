from decimal import Decimal, ROUND_HALF_UP


TAX_SLABS = [
    (Decimal("250000"), Decimal("0.00")),
    (Decimal("500000"), Decimal("0.05")),
    (Decimal("1000000"), Decimal("0.20")),
    (Decimal("Infinity"), Decimal("0.30")),
]


def calculate_tax_on_net_profit(net_profit):

    if net_profit is None:
        return Decimal("0.00")

    net_profit = Decimal(net_profit)

    if net_profit <= 0:
        return Decimal("0.00")

    tax = Decimal("0.00")
    previous_limit = Decimal("0.00")

    for limit, rate in TAX_SLABS:

        if net_profit > limit:
            taxable_amount = limit - previous_limit
        else:
            taxable_amount = net_profit - previous_limit

        if taxable_amount > 0:
            tax += taxable_amount * rate

        previous_limit = limit

        if net_profit <= limit:
            break

    # 4% Health & Education Cess
    tax += tax * Decimal("0.04")

    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
