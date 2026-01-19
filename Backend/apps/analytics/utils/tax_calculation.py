def calculate_tax_on_net_profit(net_profit: float) -> float:
    """
    Calculate income tax on net profit (individual / sole proprietor)
    using NEW tax regime slabs (India).
    Returns total tax including 4% cess.
    """

    if net_profit <= 0:
        return 0.0

    slabs = [
        (400000, 0.00),
        (800000, 0.05),
        (1200000, 0.10),
        (1600000, 0.15),
        (2000000, 0.20),
        (2400000, 0.25),
        (float("inf"), 0.30),
    ]

    tax = 0.0
    previous_limit = 0

    for limit, rate in slabs:
        if net_profit > previous_limit:
            taxable_amount = min(net_profit, limit) - previous_limit
            tax += taxable_amount * rate
            previous_limit = limit
        else:
            break

    # Health & Education Cess (4%)
    tax += tax * 0.04

    return round(tax, 2)
