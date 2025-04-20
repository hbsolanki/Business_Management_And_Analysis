export default function CallToAction({ title, description }) {
  return (
    <section className="relative bg-white py-16 sm:py-20 rounded-xl  mt-12 shadow-lg hover:shadow-xl transition-shadow duration-300 md:mx-12 md:mt-12">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-white to-blue-100 -z-10 rounded-xl"></div>
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
        <p className="mt-4 sm:mx-4 text-lg text-gray-600">{description}</p>
      </div>
    </section>
  );
}
