import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {  ArrowRight, ArrowLeft, Check, AlertCircle, Repeat, ChartBar, DollarSign, CalendarRange, Clock, List, Folder, MessageCircleQuestion } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ReactNode;
}

export function TutorialGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Introdução",
      description: "Como usar sua Ferramenta de Controle Financeiro",
      icon: <MessageCircleQuestion className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <p>
            Bem-vindo ao seu Controle Financeiro 2025! Esta ferramenta ajuda você a acompanhar receitas e despesas, 
            monitorar gastos por categoria e planejar melhor sua vida financeira.
          </p>
          <p>
            Este tutorial guiará você pelos passos necessários para configurar e usar efetivamente o sistema de 
            controle financeiro, desde o mapeamento de suas finanças até a análise de desempenho.
          </p>
          <p className="font-medium">
            Vamos começar!
          </p>
        </div>
      )
    },
    {
      title: "Mapeie suas finanças fixas",
      description: "Organize seu fluxo financeiro em categorias claras",
      icon: <Check className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p>
            Antes de começar a usar a ferramenta, é essencial ter clareza do seu fluxo financeiro. 
            Separe em 3 grupos principais:
          </p>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-bold flex items-center gap-2">
              <span className="text-primary">➕</span> Entradas Fixas
            </h4>
            <p>
              Liste todas as fontes de renda garantidas, como salários ou pensões.
            </p>
            <p className="text-sm italic mt-1">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              <strong>Importante:</strong> Não inclua valores incertos, como comissões ou &quot;talvez recebo&quot;.
            </p>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-bold flex items-center gap-2">
              <span className="text-primary">➖</span> Saídas Fixas
            </h4>
            <p>
              Liste todos os gastos que acontecem mensalmente em dias específicos:
            </p>
            <ul className="list-disc ml-5 mt-1">
              <li>Aluguel</li>
              <li>Parcelas</li>
              <li>Mensalidades</li>
              <li>Contas com vencimento certo (como escola, consórcio, etc.)</li>
            </ul>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" /> Contas Variáveis com vencimento fixo
            </h4>
            <p>
              Para contas como <strong>luz, água e internet</strong>, utilize a <strong>maior média 
              dos últimos meses</strong>, evitando surpresas desagradáveis no orçamento.
            </p>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-bold flex items-center gap-2">
              <span className="text-primary">🧾</span> Gastos Variáveis e Imprevistos
            </h4>
            <p>
              Some tudo o que você costuma gastar com:
            </p>
            <ul className="list-disc ml-5 mt-1">
              <li>Uber</li>
              <li>Lanches</li>
              <li>Delivery</li>
              <li>Compras rápidas</li>
              <li>Pequenos imprevistos</li>
            </ul>
            <p className="mt-2">
              Guarde esse total como <strong>Gastos Recorrentes Variáveis</strong> — vamos usar mais tarde.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Registre suas transações recorrentes",
      description: "Configure seus gastos e receitas fixas mensais",
      icon: <Repeat className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-4 ">
          <p>
            Agora que você tem o balanço fixo em mãos, é hora de registrar no sistema:
          </p>
          <div className='grid grid-cols-2 justify-center gap-4 divide-x'>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Vá até a seção <strong>&quot;Transações Recorrentes&quot;</strong> (botão no topo da página)</li>
            <li>Clique em <strong>&quot;Nova Recorrente&quot;</strong></li>
            <li>
              Preencha o formulário com:
              <ul className="list-disc ml-5 mt-1">
                <li>Tipo de transação (entrada ou saída)</li>
                <li>Dia do mês</li>
                <li>Descrição</li>
                <li>Valor</li>
                <li>Categoria</li>
                <li>Observações (opcional)</li>
              </ul>
            </li>
            <li>Clique em <strong>Adicionar</strong></li>
            <li>Repita para cada entrada ou saída fixa</li>
          </ol>
          
          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-md max-h-fit">
            <p className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Após cadastrar tudo, clique em <strong>&quot;Aplicar ao Mês Atual&quot;</strong>
            </p>
            <p className="mt-2">
              Isso lançará todas as transações fixas no mês atual automaticamente. Nos meses 
              seguintes, você não precisará repetir o processo!
            </p>
          </div>
          </div>
        </div>
      )
    },
    {
      title: "Visualize sua performance mensal",
      description: "Analise seus dados financeiros em gráficos intuitivos",
      icon: <ChartBar className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p>
            Depois de aplicar as transações fixas, você terá acesso a uma visão completa da sua situação financeira:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-primary/10 p-4 rounded-md">
              <h4 className="font-medium">Resumo Mensal</h4>
              <p className="text-sm">
                Visualize o total de entradas e saídas, bem como o saldo previsto para o final do mês.
              </p>
            </div>
            
            <div className="bg-primary/10 p-4 rounded-md">
              <h4 className="font-medium">Gráficos por Categoria</h4>
              <p className="text-sm">
                Veja a distribuição dos seus gastos por categoria em formato de gráfico de pizza.
              </p>
            </div>
            
            <div className="bg-primary/10 p-4 rounded-md">
              <h4 className="font-medium">Evolução do Saldo</h4>
              <p className="text-sm">
                Acompanhe como seu saldo evolui ao longo do mês, com projeções baseadas nas transações fixas.
              </p>
            </div>
            
            <div className="bg-primary/10 p-4 rounded-md">
              <h4 className="font-medium">Comparativo Mensal</h4>
              <p className="text-sm">
                Compare seu desempenho financeiro atual com meses anteriores.
              </p>
            </div>
          </div>
          
          <p>
            Esta visualização permite identificar rapidamente padrões de gastos e oportunidades de economia.
          </p>
        </div>
      )
    },
    {
      title: "Use o Limite de Gasto Diário",
      description: "Controle seus gastos diários para manter o orçamento equilibrado",
      icon: <DollarSign className="h-8 w-8 text-green-600" />,
      content: (
        <div className="space-y-4">
          <p>
            O sistema calcula automaticamente quanto você pode gastar por dia para manter o orçamento equilibrado:
          </p>
          
          <div>
            
          </div>
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-medium flex items-center gap-2">
              🧮 Fórmula do Limite Diário
            </h4>
            <div className="bg-background p-3 rounded mt-2 text-center">
              <p className="font-mono">(Entradas - Saídas) ÷ Total de dias do mês</p>
            </div>
            <p className="mt-2">
              Este valor é seu <strong>limite diário</strong> — respeitando esse valor, você chegará 
              ao fim do mês sem dívidas.
            </p>
          </div>
          
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-md">
            <p className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
              <span>
                Se seu limite diário for negativo, significa que seus gastos fixos superam suas receitas.
                Neste caso, você precisará revisar suas despesas ou aumentar sua renda.
              </span>
            </p>
          </div>
          
          <p>
            O limite diário é uma ferramenta poderosa para manter a disciplina financeira no dia a dia,
            evitando gastos impulsivos que comprometem seu orçamento.
          </p>
        </div>
      )
    },
    {
      title: "Planejador de Gastos Futuros",
      description: "Simule quanto tempo você precisa economizar para uma compra",
      icon: <CalendarRange className="h-8 w-8 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <p>
            Quer comprar algo? Use o Planejador de Gastos Futuros para simular <strong>quantos dias você precisa economizar</strong> 
            do seu limite diário para alcançar o valor desejado.
          </p>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-medium">Exemplo:</h4>
            <ul className="list-disc ml-5 mt-2">
              <li>Quero um tênis de R$ 300</li>
              <li>Meu limite diário é R$ 20</li>
              <li>Preciso economizar por <strong>15 dias</strong> para conseguir</li>
            </ul>
          </div>
          
          <p>
            Para usar o planejador:
          </p>
          
          <ol className="list-decimal ml-5 space-y-1">
            <li>Localize a seção &quot;Planejador de Gastos&quot; na tela principal</li>
            <li>Insira o valor do item que deseja comprar</li>
            <li>O sistema calculará automaticamente quantos dias você precisa economizar</li>
            <li>Você também pode ajustar o valor diário a economizar para calcular em quanto tempo atingirá sua meta</li>
          </ol>
          
          <p>
            Esta ferramenta transforma compras por impulso em decisões planejadas, ajudando você a 
            adquirir o que deseja sem comprometer suas finanças.
          </p>
        </div>
      )
    },
    {
      title: "Controle de Gastos Recorrentes Variáveis",
      description: "Transforme seu controle financeiro em um jogo diário",
      icon: <Clock className="h-8 w-8 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p>
            Lembra do valor que você somou de Uber, imprevistos, lanches, etc.? 
            Aqui é onde ele entra em ação:
          </p>
          
          <ol className="list-decimal ml-5 space-y-2">
            <li>Ative o <strong>Controle de Gastos Variáveis</strong> na tela principal</li>
            <li>Informe o valor mensal estimado (ex: R$ 450)</li>
            <li>O sistema divide automaticamente esse valor pelos dias do mês (ex: R$ 15/dia)</li>
            <li>
              Cada dia funciona como uma <strong>&quot;raspadinha&quot;</strong>:
              <ul className="list-disc ml-5 mt-1">
                <li>Se você gastar, o valor do dia é consumido</li>
                <li>Se <strong>não</strong> gastar, você pode clicar e marcar como <strong>&quot;Economizado&quot;</strong></li>
              </ul>
            </li>
          </ol>
          
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-md">
            <p className="flex items-center gap-2">
              <span className="text-blue-500">💡</span>
              <span>
                Isso transforma o controle financeiro em um jogo de economia diária! Cada dia que você 
                consegue economizar, está acumulando uma reserva para gastos maiores ou inesperados.
              </span>
            </p>
          </div>
          
          <p>
            Este sistema de &quot;raspadinha financeira&quot; é uma maneira divertida e eficaz de controlar 
            gastos variáveis, criando um incentivo visual para a economia diária.
          </p>
        </div>
      )
    },
    {
      title: "Tabela de movimentações",
      description: "Visualize e edite todas as suas transações do mês",
      icon: <List className="h-8 w-8 text-teal-500" />,
      content: (
        <div className="space-y-4">
          <p>
            No fim da tela, você encontrará a <strong>tabela com todas as transações</strong> do mês:
          </p>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-medium">Funcionalidades da tabela:</h4>
            <ul className="list-disc ml-5 mt-2">
              <li>Visualização completa de entradas e saídas</li>
              <li>Filtros por tipo de transação ou categoria</li>
              <li>Ordenação por data, valor ou descrição</li>
              <li>Possibilidade de <strong>editar ou excluir</strong> qualquer movimentação</li>
              <li>Agrupamento por data para melhor organização</li>
            </ul>
          </div>
          
          <p>
            Para gerenciar suas transações:
          </p>
          
          <ul className="list-disc ml-5 space-y-1">
            <li>Para <strong>editar</strong> uma transação, clique no ícone de lápis</li>
            <li>Para <strong>excluir</strong> uma transação, clique no ícone de lixeira</li>
            <li>Para <strong>adicionar</strong> uma nova transação, use o botão &quot;Nova Transação&quot; no topo da página</li>
          </ul>
          
          <p>
            A tabela de movimentações funciona como um registro detalhado de todas suas atividades financeiras, 
            permitindo analisar cada transação individualmente.
          </p>
        </div>
      )
    },
    {
      title: "Gerenciador de Categorias",
      description: "Personalize as categorias de acordo com seu perfil financeiro",
      icon: <Folder className="h-8 w-8 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <p>
            Para uma organização mais eficiente, você pode criar suas <strong>próprias categorias personalizadas</strong>, 
            organizando os gastos do seu jeito!
          </p>
          
          <div className="bg-primary/10 p-4 rounded-md">
            <h4 className="font-medium">Como gerenciar categorias:</h4>
            <ol className="list-decimal ml-5 mt-2">
              <li>Clique no botão <strong>&quot;Gerenciar Categorias&quot;</strong> no topo da página</li>
              <li>Na janela que se abre, você verá todas as categorias existentes</li>
              <li>Para <strong>adicionar</strong> uma nova categoria, preencha o nome e selecione um ícone</li>
              <li>Para <strong>editar</strong> uma categoria existente, clique no ícone de edição</li>
              <li>Para <strong>excluir</strong> uma categoria, clique no ícone de exclusão</li>
            </ol>
          </div>
          
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-md">
            <p className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
              <span>
                Ao excluir uma categoria que já possui transações associadas, você deverá 
                reclassificar essas transações para outra categoria.
              </span>
            </p>
          </div>
          
          <p>
            Exemplos de categorias personalizadas que você pode criar:
          </p>
          
          <ul className="grid grid-cols-2 gap-2 ml-5 list-disc">
            <li>Educação dos filhos</li>
            <li>Cuidados com pets</li>
            <li>Hobbies</li>
            <li>Investimentos</li>
            <li>Viagens</li>
            <li>Presentes</li>
          </ul>
          
          <p>
            Um bom sistema de categorias torna a análise de gastos muito mais eficiente e relevante 
            para seus objetivos financeiros específicos.
          </p>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)} 
        className="flex items-center gap-2"
      >
        <MessageCircleQuestion className="h-4 w-4" />
        Tutorial
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="flex items-center gap-2 text-xl">
                {tutorialSteps[currentStep].icon}
                {tutorialSteps[currentStep].title}
              </DialogTitle>
       
            </div>
            <DialogDescription className="text-base">
              {tutorialSteps[currentStep].description}
            </DialogDescription>
          </DialogHeader>
          
          <Card className="my-4 border-t-4 border-t-primary">
            <CardContent className="pt-6">
              {tutorialSteps[currentStep].content}
            </CardContent>
            <CardFooter className="flex justify-between pt-2 pb-4 border-t">
              <span className="text-sm text-muted-foreground">
                Passo {currentStep + 1} de {tutorialSteps.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentStep === tutorialSteps.length - 1}
                  className="flex items-center gap-1"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}