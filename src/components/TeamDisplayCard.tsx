import React from 'react';
import { UserIcon } from './Icons';
import type { PlayerDragInfo } from '../App'; // Import the interface

interface TeamDisplayCardProps {
    title: string;
    players: string[];
    icon: React.ReactNode;
    borderColor?: string;
    playerIconColor?: string;
    teamId: 'teamA' | 'teamB' | 'alternates';
    onPlayerSwap: (sourceInfo: PlayerDragInfo, targetInfo: PlayerDragInfo) => void;
    isDraggable?: boolean;
    isScreenshotting?: boolean;
}

export const TeamDisplayCard: React.FC<TeamDisplayCardProps> = ({
    title,
    players,
    icon,
    borderColor = 'border-slate-600',
    playerIconColor = 'text-yellow-400',
    teamId,
    onPlayerSwap,
    isDraggable = false,
    isScreenshotting = false
}) => {

    const handleDragStart = (event: React.DragEvent<HTMLLIElement>, playerName: string, playerIndex: number) => {
        if (!isDraggable) return;
        const dragInfo: PlayerDragInfo = { name: playerName, teamId, indexInTeam: playerIndex };
        event.dataTransfer.setData('application/json', JSON.stringify(dragInfo));
        event.dataTransfer.effectAllowed = 'move';
        event.currentTarget.classList.add('opacity-50');
        event.currentTarget.style.cursor = 'grabbing';
    };

    const handleDragOver = (event: React.DragEvent<HTMLLIElement>) => {
        if (!isDraggable) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (event: React.DragEvent<HTMLLIElement>) => {
        if (!isDraggable) return;
        event.currentTarget.classList.add('ring-2', 'ring-yellow-500', 'ring-inset');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLIElement>) => {
        if (!isDraggable) return;
        event.currentTarget.classList.remove('ring-2', 'ring-yellow-500', 'ring-inset');
    };

    const handleDrop = (event: React.DragEvent<HTMLLIElement>, targetPlayerName: string, targetPlayerIndex: number) => {
        if (!isDraggable) return;
        event.preventDefault();
        event.currentTarget.classList.remove('ring-2', 'ring-yellow-500', 'ring-inset');

        const sourceInfoString = event.dataTransfer.getData('application/json');
        if (sourceInfoString) {
            try {
                const sourceInfo: PlayerDragInfo = JSON.parse(sourceInfoString);
                const targetInfo: PlayerDragInfo = { name: targetPlayerName, teamId, indexInTeam: targetPlayerIndex };

                if (sourceInfo.name === targetInfo.name && sourceInfo.teamId === targetInfo.teamId) {
                    // Dropped on self
                } else {
                    onPlayerSwap(sourceInfo, targetInfo);
                }
            } catch (e) {
                console.error("Error parsing drag data:", e);
            }
        }
    };

    const handleDragEnd = (event: React.DragEvent<HTMLLIElement>) => {
        if (!isDraggable) return;
        event.currentTarget.classList.remove('opacity-50');
        event.currentTarget.style.cursor = 'grab';
        const allItems = event.currentTarget.closest('ul')?.querySelectorAll('li');
        allItems?.forEach(item => item.classList.remove('ring-2', 'ring-yellow-500', 'ring-inset'));
    };

    const playerNameStyle: React.CSSProperties = {
        lineHeight: '1.8',
    };

    if (isScreenshotting) {
        playerNameStyle.position = 'relative';
        playerNameStyle.bottom = '6px';
    }

    return (
        <div className={`bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-xl border-t-4 ${borderColor} h-full flex flex-col`}>
            <div className="flex items-center mb-5">
                {icon}
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">{title}</h2>
            </div>
            {players.length > 0 ? (
                <ul className="space-y-3 flex-grow">
                    {players.map((player, index) => (
                        <li
                            key={`${player}-${index}-${teamId}`}
                            className={`flex items-center text-slate-200 bg-slate-800/70 backdrop-blur-sm p-3 rounded-xl border-4 border-amber-500 shadow-xl hover:bg-slate-700/80 hover:border-amber-400 transition-all duration-150 ${isDraggable ? 'cursor-grab' : ''}`}
                            draggable={isDraggable}
                            onDragStart={(e) => handleDragStart(e, player, index)}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, player, index)}
                            onDragEnd={handleDragEnd}
                            aria-label={`Player: ${player}. Draggable.`}
                        >
                            <UserIcon className={`w-5 h-5 mr-3 ${playerIconColor} flex-shrink-0`} />
                            <span
                                className="truncate"
                                style={playerNameStyle}
                            >
                                {player}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-blue-400 italic text-center py-4 flex-grow flex items-center justify-center">No summoners assigned yet.</p>
            )}
        </div>
    );
};