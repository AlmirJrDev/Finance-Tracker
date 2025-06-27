// 'use client';

// import { useEffect, useState } from 'react';
// import LocalStorageViewer from '@/components/ui/LocalStorageViewer';
// import { Button } from '@/components/ui/button';

// const KONAMI_CODE = [
//   'ArrowUp', 'ArrowUp',
//   'ArrowDown', 'ArrowDown',
//   'ArrowLeft', 'ArrowRight',
//   'ArrowLeft', 'ArrowRight',
//   'b', 'a'
// ];

// export function KeyboardEasterEgg({ clearAppData }: { clearAppData: () => void }) {
//   const [sequence, setSequence] = useState<string[]>([]);
//   const [showDevTools, setShowDevTools] = useState(false);


//   useEffect(() => {
//     const handleKeyDown = (event: KeyboardEvent) => {
//       const key = event.key;
      
//       // Add the key to the sequence
//       const newSequence = [...sequence, key];
      
//       // Keep only the last N keys where N is the length of our sequences
//       if (newSequence.length > Math.max(KONAMI_CODE.length, )){
//         newSequence.shift();
//       }
      
//       setSequence(newSequence);
      
//       // Check if either sequence matches
//       const konamiMatch = checkSequenceMatch(newSequence, KONAMI_CODE);
  
      
//       if (konamiMatch) {
//         setShowDevTools(true);
//       }
//     };

//     const checkSequenceMatch = (current: string[], target: string[]) => {
//       if (current.length < target.length) return false;
      
//       // Get the last N keys where N is the length of the target sequence
//       const relevantKeys = current.slice(current.length - target.length);
      
//       // Check if they match
//       return target.every((key, i) => key === relevantKeys[i]);
//     };

//     window.addEventListener('keydown', handleKeyDown);
    
//     return () => {
//       window.removeEventListener('keydown', handleKeyDown);
//     };
//   }, [sequence]);

//   if (!showDevTools) return null;

//   return (
//     <div className="fixed bottom-4 right-4 z-50 bg-card p-4 rounded-lg shadow-lg border border-muted">
//       <div className="flex flex-col gap-4">
//         <div className="flex justify-between items-center">
//           <h3 className="font-bold">Limpar</h3>
//           <Button 
//             variant="ghost" 
//             size="sm" 
//             onClick={() => setShowDevTools(false)}
//           >
//             Close
//           </Button>
//         </div>
//         <LocalStorageViewer />
//         <Button onClick={clearAppData} variant="destructive">
//           Limpar Dados do App
//         </Button>
//       </div>
//     </div>
//   );
// }