// 'use client';

// import { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

// export default function LocalStorageViewer() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [storageData, setStorageData] = useState<Record<string, any>>({});

//   const loadStorageData = () => {
//     const data: Record<string, any> = {};
    
//     // Pegando todas as chaves do localStorage
//     for (let i = 0; i < localStorage.length; i++) {
//       const key = localStorage.key(i);
//       if (key) {
//         try {
//           // Tenta fazer parse como JSON
//           data[key] = JSON.parse(localStorage.getItem(key) || 'null');
//         } catch (e) {
//           // Se não for JSON, armazena como string
//           data[key] = localStorage.getItem(key);
//         }
//       }
//     }
    
//     setStorageData(data);
//   };

//   useEffect(() => {
//     if (isOpen) {
//       loadStorageData();
//     }
//   }, [isOpen]);



//   return (
//     <>
//       <Button variant="outline" onClick={() => setIsOpen(true)}>
//         Ver dados do localStorage
//       </Button>
      
//       <Dialog open={isOpen} onOpenChange={setIsOpen}>
//         <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Dados armazenados no localStorage</DialogTitle>
//           </DialogHeader>
          
//           <div className="mt-4">
//             <Button onClick={loadStorageData} variant="outline" size="sm" className="mb-4">
//               Atualizar dados
//             </Button>
            
//             {Object.keys(storageData).length === 0 ? (
//               <p className="text-center text-gray-500">Nenhum dado encontrado no localStorage</p>
//             ) : (
//               Object.entries(storageData).map(([key, value]) => (
//                 <div key={key} className="mb-6">
//                   <h3 className="text-lg font-medium mb-2">{key}</h3>
//                   <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
//                     <pre className="text-sm whitespace-pre-wrap">
//                       {JSON.stringify(value, null, 2)}
//                     </pre>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
          
//           <DialogClose asChild>
//             <Button className="mt-4" variant="outline">Fechar</Button>
//           </DialogClose>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }