import BasicBars from "@/features/analytics/components/charts/BasicBars";

function ProductDetailsBar({ Data = [] }) {
  if (!Array.isArray(Data) || Data.length === 0) return null;

  // group by category
  const groupedByCategory = Data.reduce((acc, item) => {
    const category = item.product_category || "Uncategorized";
    acc[category] = acc[category] || [];
    acc[category].push({
      ...item,
      cost_price: Number(item.cost_price),
      base_price: Number(item.base_price),
      net_profit: Number(item.net_profit),
    });
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groupedByCategory).map(
        ([category, products]) => (
          <div
            key={category}
            className="bg-white p-4 rounded-lg border"
          >
            <h3 className="text-lg font-semibold mb-4">
              Category: {category}
            </h3>

            <BasicBars
              xAxis={[
                {
                  data: products.map((p) => p.name),
                  scaleType: "band",
                },
              ]}
              series={[
                {
                  data: products.map((p) => p.cost_price),
                  label: "Cost Price",
                },
                {
                  data: products.map((p) => p.base_price),
                  label: "Base Price",
                },
                {
                  data: products.map((p) => p.net_profit),
                  label: "Net Profit",
                },
              ]}
              height={300}
            />
          </div>
        )
      )}
    </div>
  );
}

export default ProductDetailsBar;
