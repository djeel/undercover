import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import {
    VenetianMask as SpyIcon,
    Ghost as GhostIcon,
    Smile as JesterIcon,
    Shield as ShieldIcon
} from 'lucide-react';

interface RoleSelectorProps {
    roleKey: 'undercover' | 'mrWhite' | 'jester' | 'bodyguard';
    count: number;
    onChange: (newCount: number) => void;
    min?: number;
    max?: number;
    isToggle?: boolean; // For Mr. White (0 or 1)
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
    roleKey,
    count,
    onChange,
    min = 0,
    max = 10,
    isToggle = false
}) => {
    const { t } = useTranslation();

    const roleColors = {
        undercover: 'hsl(var(--primary))',
        mrWhite: 'hsl(var(--accent))',
        jester: '#F59E0B',
        bodyguard: '#10B981'
    };

    const color = roleColors[roleKey];

    const getIcon = () => {
        const Icon = {
            undercover: SpyIcon,
            mrWhite: GhostIcon,
            jester: JesterIcon,
            bodyguard: ShieldIcon
        }[roleKey];

        return <Icon className="w-5 h-5" style={{ color }} />;
    };

    const handleDecrement = () => {
        if (count > min) onChange(count - 1);
    };

    const handleIncrement = () => {
        if (count < max) onChange(count + 1);
    };

    const handleToggle = () => {
        onChange(count > 0 ? 0 : 1);
    };

    const isActive = count > 0;

    return (
        <div className={cn(
            "relative overflow-hidden rounded-xl border p-3 transition-all duration-300",
            isActive
                ? "bg-card shadow-md border-border"
                : "bg-muted/50 border-input opacity-70"
        )}
            style={isActive ? { borderColor: color, boxShadow: `0 4px 12px -3px ${color}33` } : {}}
        >
            <div className="flex items-center gap-3">
                {/* Icon Container */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors bg-background",
                        isActive ? "border-opacity-100" : "border-border"
                    )}
                    style={isActive ? { borderColor: `${color}40`, color: color } : {}}
                >
                    {getIcon()}
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        "text-sm font-bold uppercase tracking-wider truncate",
                        isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {t(`roles.${roleKey}`)}
                    </h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {t(`roleDescriptions.${roleKey}`)}
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {isToggle ? (
                        <Button
                            onClick={handleToggle}
                            size="sm"
                            className={cn(
                                "h-8 px-3 font-bold text-xs uppercase transition-colors",
                                count > 0
                                    ? "bg-foreground text-background hover:bg-foreground/90"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            {count > 0 ? "ON" : "OFF"}
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDecrement}
                                disabled={count <= min}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-full"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className={cn(
                                "w-6 text-center font-bold text-lg",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {count}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleIncrement}
                                disabled={count >= max}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-full"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoleSelector;
