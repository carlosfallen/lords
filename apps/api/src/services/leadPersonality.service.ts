import { ConversationMessage } from './prospectConversationState.service';

export interface LeadPersonality {
    communicationStyle: 'formal' | 'informal' | 'direct' | 'unknown';
    responseSpeed: 'fast' | 'slow' | 'unknown';
    lastEmotion: 'neutral' | 'busy' | 'cold' | 'playful';
}

export function detectCommunicationStyle(text: string): 'formal' | 'informal' | 'direct' | 'unknown' {
    const t = text.toLowerCase();
    if (/(sr\.|sra\.|prezado|cordialmente|atenciosamente|boa tarde prezado)/i.test(t)) return 'formal';
    if (/(kkk|rsrs|mano|cara|véi|blz|top|tmj|bora)/i.test(t)) return 'informal';
    if (text.length < 25 && !/(olá|bom dia|boa tarde|boa noite)/i.test(t)) return 'direct';
    return 'unknown';
}

export function detectEmotion(text: string): 'neutral' | 'busy' | 'cold' | 'playful' {
    const t = text.toLowerCase();
    if (/(kkk|rsrs|hahaha|legal|top|adorei|maneiro|genial|manda ver)/i.test(t)) return 'playful';
    if (/(não tenho tempo|muita correria|agora não dá|tô no serviço|tô ocupado|rápido)/i.test(t) || (text.length < 15 && text.includes('?'))) return 'busy';
    if (/(não tenho interesse|pare de mandar|não quero|chega|não tem como)/i.test(t) || (text.length < 10 && !/(olá|oi|bom dia)/i.test(t))) return 'cold';
    return 'neutral';
}

export function updateLeadPersonality(
    current: LeadPersonality | undefined,
    incomingText: string,
    history: ConversationMessage[]
): LeadPersonality {
    const prev = current || { communicationStyle: 'unknown', responseSpeed: 'unknown', lastEmotion: 'neutral' };

    // Style evolves slowly, favor informal if ever detected
    let style = prev.communicationStyle;
    const detectedStyle = detectCommunicationStyle(incomingText);
    if (detectedStyle === 'informal' || (detectedStyle !== 'unknown' && style === 'unknown')) {
        style = detectedStyle;
    }

    // Emotion is highly volatile, always override with latest
    const emotion = detectEmotion(incomingText);

    // Response speed (simplified for now based on history timestamps if needed, or default)
    let speed = prev.responseSpeed;
    if (history.length >= 2) {
        const lastBotMsg = history.slice().reverse().find(m => m.role === 'assistant');
        if (lastBotMsg) {
            const timeDiff = new Date().getTime() - new Date(lastBotMsg.timestamp).getTime();
            if (timeDiff < 1000 * 60 * 5) speed = 'fast'; // Under 5 minutes
            else if (timeDiff > 1000 * 60 * 60 * 24) speed = 'slow'; // Over 24 hours
        }
    }

    return {
        communicationStyle: style,
        responseSpeed: speed,
        lastEmotion: emotion,
    };
}
