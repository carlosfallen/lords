import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';

interface Props {
    value: string;
    size?: number;
}

export function QRCodeDisplay({ value, size = 200 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!canvasRef.current || !value) return;
        setError(false);

        QRCode.toCanvas(canvasRef.current, value, {
            width: size,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        }).catch(() => setError(true));
    }, [value, size]);

    if (!value) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <Loader2 size={24} className="animate-spin text-dark-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="flex items-center justify-center bg-dark-800 rounded-lg text-xs text-red-400"
                style={{ width: size, height: size }}
            >
                Erro ao gerar QR
            </div>
        );
    }

    return (
        <div className="bg-white p-3 rounded-xl inline-block">
            <canvas ref={canvasRef} />
        </div>
    );
}
