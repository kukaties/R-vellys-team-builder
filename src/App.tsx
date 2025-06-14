import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TeamDisplayCard } from './components/TeamDisplayCard';
import { ShuffleIcon, UsersIcon, UserGroupIcon, ExclamationTriangleIcon, CameraIcon } from './components/Icons';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface PlayerInput {
  name: string;
  options: string[];
}

export interface PlayerDragInfo {
  name: string;
  teamId: 'teamA' | 'teamB' | 'alternates';
  indexInTeam: number;
}

type UiPhase = 'input' | 'submitting' | 'results';

const App: React.FC = () => {
  const [playerInputs, setPlayerInputs] = useState<PlayerInput[]>(
    Array(10).fill(null).map(() => ({ name: '', options: [] }))
  );
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [alternates, setAlternates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uiPhase, setUiPhase] = useState<UiPhase>('input');
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const screenshotAreaRef = useRef<HTMLDivElement>(null);

  const [isScreenshotLibReady, setIsScreenshotLibReady] = useState<boolean>(false);
  const [screenshotLibError, setScreenshotLibError] = useState<string | null>(null);
  const [isScreenshotting, setIsScreenshotting] = useState<boolean>(false); // Added state

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // Try for 5 seconds (10 * 500ms)
    const intervalTime = 500; // ms

    if (typeof window.html2canvas !== 'undefined') {
      setIsScreenshotLibReady(true);
      return;
    }

    const intervalId = setInterval(() => {
      attempts++;
      if (typeof window.html2canvas !== 'undefined') {
        setIsScreenshotLibReady(true);
        setScreenshotLibError(null);
        clearInterval(intervalId);
      } else if (attempts >= maxAttempts) {
        setIsScreenshotLibReady(false);
        const libLoadErrorMsg = 'Screenshot library (html2canvas) failed to load. Please check internet/ad-blockers or refresh. Screenshots unavailable.';
        setScreenshotLibError(libLoadErrorMsg);
        // Also show a temporary general error
        setError(libLoadErrorMsg);
        setTimeout(() => setError(null), 10000);
        console.error('html2canvas still not loaded after multiple attempts.');
        clearInterval(intervalId);
      }
    }, intervalTime);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);


  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayerInputs = [...playerInputs];
    let finalName = name;
    if (name.trim().toLowerCase() === 'mattipatti') {
      finalName = 'Matti is the best';
    }
    newPlayerInputs[index] = { ...newPlayerInputs[index], name: finalName };
    setPlayerInputs(newPlayerInputs);
    if (error) setError(null);
  };

  const handlePlayerOptionChange = (index: number, optionValue: string) => {
    const newPlayerInputs = [...playerInputs];
    const currentOptions = newPlayerInputs[index].options;
    if (currentOptions.includes(optionValue)) {
      newPlayerInputs[index] = {
        ...newPlayerInputs[index],
        options: currentOptions.filter(opt => opt !== optionValue)
      };
    } else {
      newPlayerInputs[index] = {
        ...newPlayerInputs[index],
        options: [...currentOptions, optionValue]
      };
    }
    setPlayerInputs(newPlayerInputs);
  };

  const clearPlayerOptions = (index: number) => {
    const newPlayerInputs = [...playerInputs];
    newPlayerInputs[index] = { ...newPlayerInputs[index], options: [] };
    setPlayerInputs(newPlayerInputs);
  };

  const handlePlayerNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < 10) {
        const nextInput = document.getElementById(`player-input-${nextIndex}`);
        nextInput?.focus();
      } else {
        const draftButton = document.getElementById('draft-teams-button');
        draftButton?.focus();
      }
    }
  };

  const handleGenerateTeams = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setTeamA([]);
    setTeamB([]);
    setAlternates([]);
    setUiPhase('submitting');

    const processedPlayerDetails: PlayerInput[] = playerInputs.map((player, index) => {
      const trimmedName = player.name.trim();
      return {
        name: trimmedName === '' ? `Summoner ${index + 1}` : trimmedName,
        options: player.options,
      };
    });

    const uniquePlayerNames = new Set(processedPlayerDetails.map(p => p.name));
    if (uniquePlayerNames.size < processedPlayerDetails.length) {
        setError('Duplicate names found. Please ensure all names (including auto-filled ones) are unique.');
        setUiPhase('input');
        setIsLoading(false);
        return;
    }

    setTimeout(() => {
      const newTeamA: string[] = [];
      const newTeamB: string[] = [];
      const assignedPlayerNames = new Set<string>();

      const tryAssignPlayer = (player: PlayerInput, team: string[]) => {
        if (player && team.length < 5 && !assignedPlayerNames.has(player.name)) {
            team.push(player.name);
            assignedPlayerNames.add(player.name);
            return true;
        }
        return false;
      };

      const playersA = shuffleArray(processedPlayerDetails.filter(p => p.options.includes('A')));
      const playersB = shuffleArray(processedPlayerDetails.filter(p => p.options.includes('B')));
      const playersC = shuffleArray(processedPlayerDetails.filter(p => p.options.includes('C')));

      const optionCategories: { [key: string]: PlayerInput[] } = { A: playersA, B: playersB, C: playersC };
      for (const optionKey of ['A', 'B', 'C'] as const) {
        const currentOptionList = optionCategories[optionKey];

        if (currentOptionList.length > 0) {
            const candidate = currentOptionList.find(p => !assignedPlayerNames.has(p.name));
            if (candidate) tryAssignPlayer(candidate, newTeamA);
        }
        if (currentOptionList.length > 0) {
            const candidate = currentOptionList.find(p => !assignedPlayerNames.has(p.name));
            if (candidate) tryAssignPlayer(candidate, newTeamB);
        }
      }

      const remainingUnassignedPlayers = shuffleArray(
        processedPlayerDetails.filter(p => !assignedPlayerNames.has(p.name))
      );

      let turnForTeamA = newTeamA.length <= newTeamB.length;

      while ((newTeamA.length < 5 || newTeamB.length < 5) && remainingUnassignedPlayers.length > 0) {
        const playerToAssign = remainingUnassignedPlayers.shift();
        if (!playerToAssign) break;

        let assignedThisTurn = false;
        if (turnForTeamA) {
            if (newTeamA.length < 5) {
                assignedThisTurn = tryAssignPlayer(playerToAssign, newTeamA);
            }
        } else {
            if (newTeamB.length < 5) {
                assignedThisTurn = tryAssignPlayer(playerToAssign, newTeamB);
            }
        }

        if (!assignedThisTurn && remainingUnassignedPlayers.length >=0) {
             if (!turnForTeamA && newTeamA.length < 5) {
                 assignedThisTurn = tryAssignPlayer(playerToAssign, newTeamA);
             } else if (turnForTeamA && newTeamB.length < 5) {
                 assignedThisTurn = tryAssignPlayer(playerToAssign, newTeamB);
             }
        }

        if (newTeamA.length < newTeamB.length) {
            turnForTeamA = true;
        } else if (newTeamB.length < newTeamA.length) {
            turnForTeamA = false;
        } else {
            turnForTeamA = !turnForTeamA;
        }

        if (newTeamA.length >= 5 && newTeamB.length < 5) turnForTeamA = false;
        if (newTeamB.length >= 5 && newTeamA.length < 5) turnForTeamA = true;
      }

      const newAlternates = processedPlayerDetails.filter(p => !assignedPlayerNames.has(p.name)).map(p => p.name);

      setTeamA(newTeamA);
      setTeamB(newTeamB);
      setAlternates(newAlternates);
      setUiPhase('results');
    }, 1200);

  }, [playerInputs, shuffleArray]);

  useEffect(() => {
    if (uiPhase === 'results') {
      setIsLoading(false);
      const timer = setTimeout(() => {
        if (resultsSectionRef.current) {
          resultsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (uiPhase === 'input') {
      setIsLoading(false);
    }
  }, [uiPhase]);

  const handleReset = () => {
    setUiPhase('input');
    setTeamA([]);
    setTeamB([]);
    setAlternates([]);
    setError(null);
    setScreenshotLibError(null); // Clear screenshot lib error on reset
    setPlayerInputs(prevPlayerInputs =>
      prevPlayerInputs.map(player => ({ ...player, options: [] }))
    );
  };

  const handlePlayerSwap = (sourceInfo: PlayerDragInfo, targetInfo: PlayerDragInfo) => {
    if (sourceInfo.name === targetInfo.name && sourceInfo.teamId === targetInfo.teamId) {
      return;
    }

    const getTeamState = (teamId: PlayerDragInfo['teamId']): string[] => {
      if (teamId === 'teamA') return teamA;
      if (teamId === 'teamB') return teamB;
      return alternates;
    };

    const getTeamSetter = (teamId: PlayerDragInfo['teamId']): React.Dispatch<React.SetStateAction<string[]>> => {
      if (teamId === 'teamA') return setTeamA;
      if (teamId === 'teamB') return setTeamB;
      return setAlternates;
    };

    const sourceList = [...getTeamState(sourceInfo.teamId)];
    const targetList = sourceInfo.teamId === targetInfo.teamId ? sourceList : [...getTeamState(targetInfo.teamId)];

    const draggedPlayerName = sourceInfo.name;
    const targetPlayerName = targetInfo.name;

    sourceList[sourceInfo.indexInTeam] = targetPlayerName;
    targetList[targetInfo.indexInTeam] = draggedPlayerName;

    getTeamSetter(sourceInfo.teamId)(sourceList);
    if (sourceInfo.teamId !== targetInfo.teamId) {
      getTeamSetter(targetInfo.teamId)(targetList);
    }
  };

  const handleScreenshotResults = async () => {
    if (!isScreenshotLibReady) {
      const msg = screenshotLibError || 'Screenshot library (html2canvas) is not ready. Please wait or refresh the page.';
      console.error('Screenshot attempt failed: html2canvas not ready.');
      setError(msg);
      setTimeout(() => setError(null), 7000);
      return;
    }

    if (typeof window.html2canvas === 'undefined') { // Final safeguard
      console.error('html2canvas library is not loaded on the window object (final check).');
      setError('Screenshot library (html2canvas) still not loaded. Please ensure it is not blocked and try refreshing.');
      setTimeout(() => setError(null), 7000);
      return;
    }
    
    if (!screenshotAreaRef.current) {
      console.error('Screenshot area ref (screenshotAreaRef.current) is null or undefined.');
      setError('Screenshot area not found. The results might not be fully rendered or an unexpected error occurred.');
      setTimeout(() => setError(null), 7000);
      return;
    }

    setIsScreenshotting(true); // Set screenshotting state to true

    try {
      // Ensure React has a chance to re-render with isScreenshotting=true
      await new Promise(resolve => setTimeout(resolve, 50)); 

      const canvas = await window.html2canvas(screenshotAreaRef.current, {
        useCORS: true,
        backgroundColor: '#0a101f', 
        scale: 2, 
        logging: false,
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = 'ravelllys_teams_screenshot.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error taking screenshot with html2canvas:', err);
      const errorMessage = (err instanceof Error && err.message) ? err.message : 'An unknown error occurred.';
      setError(`Failed to capture screenshot: ${errorMessage}`);
      setTimeout(() => setError(null), 7000);
    } finally {
      setIsScreenshotting(false); // Reset screenshotting state
    }
  };

  const allPlayersHaveOptions = playerInputs.every(player => player.options.length > 0);

  return (
    <div className="min-h-screen text-slate-100 p-4 sm:p-8 flex flex-col items-center selection:bg-yellow-500 selection:text-blue-900">
      <header className="mt-6 text-center">
        <h1
          className="text-4xl sm:text-5xl font-extrabold text-[#fcc96b] py-3 sm:py-5"
          style={{ fontFamily: '"Berlin Sans FB Demi Bold", "Berlin Sans FB Demi", "Berlin Sans FB Bold", "Berlin Sans FB", \'Inter\', sans-serif' }}
        >
          RÄVELLYS TEAM BUILDER
        </h1>
      </header>

      <main className={`w-full max-w-2xl mb-4 transition-all duration-500 ease-in-out ${
          uiPhase === 'input'
          ? 'opacity-100 translate-y-0 max-h-[2000px]'
          : 'opacity-0 -translate-y-5 scale-95 max-h-0 pointer-events-none overflow-hidden'
        }`}
      >
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {playerInputs.map((player, index) => (
              <div key={index} className="bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-blue-800/60 shadow-md">
                <input
                  id={`player-input-${index}`}
                  type="text"
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  onKeyDown={(e) => handlePlayerNameKeyDown(e, index)}
                  placeholder={`Summoner ${index + 1}`}
                  className="w-full p-3 bg-blue-900/60 border border-blue-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-slate-100 placeholder-blue-400 text-sm transition-colors duration-150 mb-3"
                  aria-label={`Summoner ${index + 1} name`}
                />
                <fieldset>
                  <legend className="sr-only">Options for Summoner {index + 1}</legend>
                  <div className="flex justify-around items-center space-x-1 sm:space-x-2">
                    {['A', 'B', 'C'].map((opt) => (
                      <label
                        key={opt}
                        htmlFor={`player-option-${index}-${opt}`}
                        className="flex items-center space-x-1 py-1 px-2 rounded-md hover:bg-blue-700/50 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          id={`player-option-${index}-${opt}`}
                          value={opt}
                          checked={player.options.includes(opt)}
                          onChange={() => handlePlayerOptionChange(index, opt)}
                          className="form-checkbox h-4 w-4 text-yellow-500 accent-yellow-500 bg-blue-900 border-blue-600 focus:ring-1 focus:ring-offset-0 focus:ring-yellow-500"
                          aria-label={`Option ${opt} for Summoner ${index + 1}`}
                        />
                        <span className="text-sm text-blue-200">{opt}</span>
                      </label>
                    ))}
                     <button
                        type="button"
                        onClick={() => clearPlayerOptions(index)}
                        className={`py-1 px-2 rounded-md text-xs hover:bg-blue-700/50 transition-colors ${player.options.length === 0 ? 'bg-blue-700/30' : 'bg-transparent' } text-blue-300`}
                        aria-label={`Clear options for Summoner ${index + 1}`}
                        title="Clear options"
                      >
                        None
                      </button>
                  </div>
                </fieldset>
              </div>
            ))}
          </div>

          {error && uiPhase === 'input' && (
            <div id="error-message" role="alert" className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-600/50 rounded-md flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          <button
            id="draft-teams-button"
            onClick={handleGenerateTeams}
            disabled={isLoading}
            className="mt-6 w-full bg-[#fcc96b] hover:bg-[#eeb85a] text-blue-950 font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-[#fcc96b]/30 transition-all duration-300 ease-in-out flex items-center justify-center text-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
            aria-label="Generate Teams Button"
          >
            {isLoading && uiPhase === 'submitting' ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Drafting Teams...
              </>
            ) : allPlayersHaveOptions ? (
              <>
                <ShuffleIcon className="w-6 h-6 mr-2" aria-hidden="true" />
                im a silly goof
              </>
            ) : (
              <>
                <ShuffleIcon className="w-6 h-6 mr-2" aria-hidden="true" />
                Draft Teams
              </>
            )}
          </button>
        </div>
      </main>

      {uiPhase === 'submitting' && isLoading && (
        <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-opacity duration-300 ease-in-out opacity-100" aria-live="assertive">
          <svg className="animate-spin h-16 w-16 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-5 text-xl text-yellow-400 font-semibold tracking-wider">Drafting Your Champions...</p>
        </div>
      )}

      <div
        ref={resultsSectionRef}
        className={`w-full max-w-5xl transition-all duration-700 ease-out ${
          uiPhase === 'results'
          ? 'opacity-100 translate-y-0 scale-100 delay-200'
          : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
        }`}
        aria-hidden={uiPhase !== 'results'}
      >
        {uiPhase === 'results' && (teamA.length > 0 || teamB.length > 0 || alternates.length > 0) && (
          <>
            <div ref={screenshotAreaRef} className="p-1"> 
              <section aria-label="Generated Teams" className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
                  <TeamDisplayCard
                    title="Team 1"
                    players={teamA}
                    icon={<UserGroupIcon className="w-8 h-8 mr-3 text-sky-400" aria-hidden="true" />}
                    borderColor="border-sky-500"
                    playerIconColor="text-sky-300"
                    teamId="teamA"
                    onPlayerSwap={handlePlayerSwap}
                    isDraggable={true}
                    isScreenshotting={isScreenshotting} 
                  />
                  <TeamDisplayCard
                    title="Team 2"
                    players={teamB}
                    icon={<UserGroupIcon className="w-8 h-8 mr-3 text-red-400" aria-hidden="true" />}
                    borderColor="border-red-500"
                    playerIconColor="text-red-300"
                    teamId="teamB"
                    onPlayerSwap={handlePlayerSwap}
                    isDraggable={true}
                    isScreenshotting={isScreenshotting}
                  />
                </div>
              </section>

              {alternates.length > 0 && (
                <section aria-label="Alternates" className="w-full max-w-5xl md:max-w-xl mx-auto mt-6 sm:mt-8">
                  <TeamDisplayCard
                    title="Alternates"
                    players={alternates}
                    icon={<UsersIcon className="w-8 h-8 mr-3 text-yellow-400" aria-hidden="true" />}
                    borderColor="border-yellow-600"
                    playerIconColor="text-yellow-300"
                    teamId="alternates"
                    onPlayerSwap={handlePlayerSwap}
                    isDraggable={true}
                    isScreenshotting={isScreenshotting}
                  />
                </section>
              )}
            </div>
            
            {screenshotLibError && uiPhase === 'results' && (
            <div id="screenshot-lib-error-message" role="alert" className="mt-4 mb-4 p-3 bg-yellow-700/40 text-yellow-200 border border-yellow-600/60 rounded-md flex items-center max-w-xl mx-auto">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 text-yellow-400" />
              <span>{screenshotLibError}</span>
            </div>
            )}

            {error && uiPhase === 'results' && !screenshotLibError && ( // Only show general error if not a screenshot lib error
            <div id="error-message-results" role="alert" className="mt-4 mb-4 p-3 bg-red-700/30 text-red-300 border border-red-600/50 rounded-md flex items-center max-w-xl mx-auto">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            )}

            <div className="mt-10 mb-6 text-center flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 ease-in-out flex items-center justify-center text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Draft New Teams Button"
              >
                <ShuffleIcon className="w-6 h-6 mr-2" aria-hidden="true" />
                Draft New Teams
              </button>
              <button
                onClick={handleScreenshotResults}
                disabled={!isScreenshotLibReady || isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-green-500/40 transition-all duration-300 ease-in-out flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:from-emerald-500 disabled:hover:to-green-600"
                aria-label="Screenshot Results Button"
                title={!isScreenshotLibReady ? "Screenshot library not loaded" : "Capture team results"}
              >
                <CameraIcon className="w-6 h-6 mr-2" aria-hidden="true" />
                Screenshot Results
              </button>
            </div>
          </>
        )}
      </div>

       <footer className={`mt-auto pt-6 text-center text-blue-400 text-sm transition-opacity duration-300 ${uiPhase === 'submitting' && isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <p>&copy; {new Date().getFullYear()} RÄVELLYS TEAM BUILDER. May your Nexus stand strong.</p>
      </footer>
    </div>
  );
};

export default App;