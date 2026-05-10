/**
 * NLP Engine for SafraCerta.ai
 * Rule-based parser for Portuguese agricultural context
 */

const NLPEngine = {
    categories: {
        'combustível': ['diesel', 'gasolina', 'combustivel', 'abasteci', 'tanque'],
        'sementes': ['semente', 'soja', 'milho', 'trigo', 'plantio', 'saca'],
        'fertilizantes': ['adubo', 'fertilizante', 'ureia', 'npk', 'fosfato'],
        'defensivos': ['veneno', 'defensivo', 'herbicida', 'inseticida', 'fungicida', 'apliquei'],
        'mão de obra': ['pagamento', 'diaria', 'peao', 'ajudante', 'funcionario'],
        'manutenção': ['conserto', 'oficina', 'peça', 'reparo', 'trator', 'maquina'],
        'venda': ['vendi', 'venda', 'entrega', 'colheita', 'lucro']
    },

    parse(text) {
        const lowerText = text.toLowerCase();
        const result = {
            type: 'expense', // default
            value: 0,
            category: 'outros',
            details: text,
            plot: 'Geral'
        };

        // 1. Determine Type
        if (lowerText.includes('vendi') || lowerText.includes('recebi') || lowerText.includes('ganhei')) {
            result.type = 'revenue';
        }

        // 2. Extract Value (Handles: "200 reais", "R$ 200", "200,50")
        const valueMatch = lowerText.match(/(\d+([.,]\d+)?)/);
        if (valueMatch) {
            result.value = parseFloat(valueMatch[1].replace(',', '.'));
        }

        // 3. Extract Category
        for (const [cat, keywords] of Object.entries(this.categories)) {
            if (keywords.some(kw => lowerText.includes(kw))) {
                result.category = cat;
                if (cat === 'venda') result.type = 'revenue';
                break;
            }
        }

        // 4. Extract Plot (Talhão)
        const plotMatch = lowerText.match(/talh[ãa]o\s*(\d+)/);
        if (plotMatch) {
            result.plot = `Talhão ${plotMatch[1]}`;
        }

        return result;
    }
};

// Export for use in app.js
if (typeof module !== 'undefined') module.exports = NLPEngine;
