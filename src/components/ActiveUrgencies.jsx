import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, Clock, MapPin, Plus } from 'lucide-react';

const ActiveUrgencies = () => {
    const [urgencies, setUrgencies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUrgencies();
    }, []);

    const fetchUrgencies = async () => {
        try {
            const { data, error } = await supabase
                .from('solicitacoes_urgentes')
                .select('*')
                .eq('status', 'ATIVA')
                .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(10); // Start with 10 to show semblance of scroll

            if (data) setUrgencies(data);
        } catch (error) {
            console.error('Error fetching urgencies:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigate = useNavigate();

    const handleHelp = (id) => {
        navigate(`/signin?urgency_id=${id}&action=help`);
    };

    if (loading || urgencies.length === 0) return null;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-8 mb-6">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="flex items-center text-gray-800 font-bold text-lg">
                    <div className="bg-red-100 p-1.5 rounded-full mr-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    Urgências da Rede
                </h3>
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wider bg-red-50 px-2 py-1 rounded-md border border-red-100">
                    Ao Vivo 24h
                </span>
            </div>

            {/* Stories Container */}
            <div className="relative group">
                <div
                    className="flex space-x-4 overflow-x-auto pb-6 scrollbar-hide px-2 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* "Add" Card Placeholder (Optional concept: "Create Urgency") */}
                    {/* <div className="flex-shrink-0 w-36 h-56 snap-start">
                        <div className="w-full h-full bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group/add">
                            <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover/add:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-gray-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 text-center px-2">Nova Urgência</span>
                        </div>
                    </div> */}

                    {urgencies.map((urg) => (
                        <div
                            key={urg.id}
                            className="flex-shrink-0 w-40 h-64 snap-start relative flex flex-col cursor-pointer transition-transform hover:-translate-y-1"
                            onClick={() => handleHelp(urg.id)}
                        >
                            {/* Card with Gradient Border imitating 'Story' ring */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-brand-periwinkle p-[2px] shadow-sm">
                                <div className="w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col relative">
                                    {/* Header / Top */}
                                    <div className="h-24 bg-gradient-to-b from-red-50 to-white p-3 flex flex-col items-center justify-center text-center">
                                        <div className="bg-white p-1.5 rounded-full shadow-sm mb-1">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                        </div>
                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide px-2 bg-red-50 rounded-full border border-red-100">
                                            {urg.nivel_urgencia_label || 'Alta'}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-3 flex flex-col items-center text-center justify-between bg-white z-10">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 mb-1">
                                                {urg.item_nome}
                                            </h4>
                                            <p className="text-xs text-gray-500 mb-2">
                                                Qtd: <span className="font-semibold text-gray-700">{urg.quantidade}</span>
                                            </p>
                                        </div>

                                        <div className="w-full pt-2 border-t border-gray-100 mt-auto">
                                            <div className="flex items-center justify-center text-[10px] text-gray-500 mb-2">
                                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                                <span className="truncate max-w-[80px]">{urg.cidade || 'Bahia'}</span>
                                            </div>
                                            <button className="w-full bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                                                Ajudar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Institution Name Overlay at top */}
                                    <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/5 to-transparent">
                                        <p className="text-[9px] font-medium text-center text-gray-500 truncate opacity-0">
                                            {urg.contato_instituicao}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Padding at the end */}
                    <div className="w-2 flex-shrink-0"></div>
                </div>

                {/* Horizontal Fade Masks for Scrolling Indication */}
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
                {/* <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none"></div> */}
            </div>
        </div>
    );
};

export default ActiveUrgencies;
