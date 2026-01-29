import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function FeatureSection({ title, description, keyTerms = [], howItWorks = [] }) {
    return (
        <div className="group relative bg-white rounded-3xl p-8 mb-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                <Sparkles className="h-24 w-24 text-blue-600" />
            </div>

            <div className="relative z-10">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">{title}</h3>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-3xl">{description}</p>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {keyTerms.length > 0 && (
                        <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100/50">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900 uppercase tracking-wider mb-5">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                Key Terms
                            </h4>
                            <ul className="space-y-4">
                                {keyTerms.map((term, index) => (
                                    <li key={index} className="flex flex-col bg-white rounded-xl p-4 shadow-sm border border-amber-100">
                                        <span className="font-bold text-gray-900 text-sm mb-1">{term.term}</span>
                                        <span className="text-gray-600 text-sm leading-relaxed">{term.definition}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {howItWorks.length > 0 && (
                        <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100/50">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900 uppercase tracking-wider mb-5">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                How It Works
                            </h4>
                            <div className="space-y-4">
                                {howItWorks.map((step, index) => (
                                    <div key={index} className="flex gap-4 items-start">
                                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-white text-emerald-600 text-sm font-bold shadow-sm border border-emerald-100">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed pt-1.5 font-medium">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
