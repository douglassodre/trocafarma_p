import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';

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
                .limit(5);

            if (data) setUrgencies(data);
        } catch (error) {
            console.error('Error fetching urgencies:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigate = useNavigate();

    const handleHelp = (id) => {
        // Redirect to signin with a reference to the urgency
        navigate(`/signin?urgency_id=${id}&action=help`);
    };

    if (loading || urgencies.length === 0) return null;

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-12 mt-8 mb-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm animate-pulse-slow">
                <h3 className="flex items-center text-red-700 font-bold mb-3 text-sm uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Urgências Ativas na Rede
                </h3>
                <div className="flex flex-col space-y-3">
                    {urgencies.map((urg) => (
                        <div key={urg.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900">
                                    {urg.contato_instituicao || 'Instituição Parceira'} precisa de: <span className="text-red-600">{urg.quantidade}x {urg.item_nome}</span>
                                </span>
                                <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
                                    <span className="flex items-center font-medium text-red-700"><Clock className="w-3 h-3 mr-1" /> {urg.nivel_urgencia_label}</span>
                                    <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {urg.cidade || 'Bahia'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleHelp(urg.id)}
                                className="mt-2 md:mt-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-full transition-colors whitespace-nowrap shadow-sm hover:shadow-md transform hover:scale-105"
                            >
                                Eu tenho esse item - Ajudar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActiveUrgencies;
