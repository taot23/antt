import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clearHistoryCache } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, CornerDownRight, ArrowLeft, FileCheck, Settings2, Users, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormControl } from "@/components/ui/form";

// Função para obter a descrição do status
function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'in_progress': return 'Em Andamento';
    case 'returned': return 'Devolvida';
    case 'completed': return 'Concluída';
    case 'canceled': return 'Cancelada';
    case 'corrected': return 'Corrigida Aguardando Operacional';
    default: return status;
  }
}

// Função para obter a cor do status
function getStatusVariant(status: string) {
  switch (status) {
    case 'pending': return 'warning';
    case 'in_progress': return 'secondary';
    case 'returned': return 'destructive';
    case 'completed': return 'success';
    case 'canceled': return 'outline';
    case 'corrected': return 'primary';
    default: return 'default';
  }
}

type SaleOperationDialogProps = {
  open: boolean;
  onClose: () => void;
  saleId?: number;
};

export default function SaleOperationDialog({
  open,
  onClose,
  saleId,
}: SaleOperationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [returnReason, setReturnReason] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [isReturning, setIsReturning] = useState(false);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<number | null>(null);
  const [selectedServiceProviderId, setSelectedServiceProviderId] = useState<number | null>(null);
  const [showServiceProviderField, setShowServiceProviderField] = useState(false);
  
  // Limpar o cache do histórico quando o diálogo é aberto
  useEffect(() => {
    if (open && saleId) {
      clearHistoryCache(saleId);
      console.log(`[SaleOperationDialog] Cache de histórico limpo para venda #${saleId}`);
    }
  }, [open, saleId]);

  // Query para obter os detalhes da venda
  const { data: sale, isLoading: saleLoading } = useQuery({
    queryKey: ["/api/sales", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const response = await fetch(`/api/sales/${saleId}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar venda");
      }
      const saleData = await response.json();
      
      // Adicionar logs para debug - verifica se a OS 12 tem o status correto
      if(saleData?.orderNumber === "12") {
        console.log("ENCONTRADA OS 12:", saleData);
        console.log("Status da OS 12:", saleData.status);
        console.log("Perfil do usuário atual:", user?.role);
      }
      
      return saleData;
    },
    enabled: !!saleId && open,
  });

  // Query para obter os itens da venda
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/sales", saleId, "items"],
    queryFn: async () => {
      if (!saleId) return [];
      const response = await fetch(`/api/sales/${saleId}/items`);
      if (!response.ok) {
        throw new Error("Erro ao carregar itens da venda");
      }
      return response.json();
    },
    enabled: !!saleId && open,
  });

  // Query para obter o histórico de status
  const { data: statusHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/sales", saleId, "history"],
    queryFn: async () => {
      if (!saleId) return [];
      console.log(`[SaleOperationDialog] Carregando histórico da venda #${saleId}`);
      const response = await fetch(`/api/sales/${saleId}/history`);
      if (!response.ok) {
        console.error(`[SaleOperationDialog] Erro ao carregar histórico: ${response.status}`);
        throw new Error("Erro ao carregar histórico de status");
      }
      const data = await response.json();
      console.log(`[SaleOperationDialog] Histórico carregado: ${data.length} registros`);
      return data;
    },
    enabled: !!saleId && open,
  });

  // Query para obter dados complementares
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) {
        throw new Error("Erro ao carregar serviços");
      }
      return response.json();
    },
    enabled: open,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) {
        throw new Error("Erro ao carregar clientes");
      }
      return response.json();
    },
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }
      return response.json();
    },
    enabled: open,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const response = await fetch("/api/service-types");
      if (!response.ok) {
        throw new Error("Erro ao carregar tipos de serviço");
      }
      return response.json();
    },
    enabled: open,
  });
  
  // Query para obter os prestadores de serviço
  const { data: serviceProviders = [] } = useQuery({
    queryKey: ["/api/service-providers"],
    queryFn: async () => {
      const response = await fetch("/api/service-providers");
      if (!response.ok) {
        throw new Error("Erro ao carregar prestadores de serviço");
      }
      return response.json();
    },
    enabled: open && showServiceProviderField,
  });

  // Mutation para iniciar a execução da venda
  const startExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!saleId) throw new Error("ID da venda não fornecido");
      
      // Validação obrigatória: tipo de serviço precisa ser selecionado
      if (!selectedServiceTypeId) {
        throw new Error("É necessário selecionar um tipo de execução");
      }
      
      // Se o tipo de serviço for SINDICATO, o prestador parceiro é obrigatório
      const serviceType = serviceTypes.find((type: any) => type.id === selectedServiceTypeId);
      if (serviceType?.name === "SINDICATO" && !selectedServiceProviderId) {
        throw new Error("É necessário selecionar um prestador parceiro para execução via SINDICATO");
      }
      
      // Preparar dados para envio
      const requestData: any = {
        serviceTypeId: selectedServiceTypeId,
      };
      
      // Adicionar prestador parceiro apenas se selecionado
      if (selectedServiceProviderId) {
        requestData.serviceProviderId = selectedServiceProviderId;
      }
      
      const response = await fetch(`/api/sales/${saleId}/start-execution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao iniciar execução da venda");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", saleId] });
      toast({
        title: "Execução iniciada",
        description: "A execução da venda foi iniciada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar execução",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para completar a execução da venda
  const completeExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!saleId) throw new Error("ID da venda não fornecido");
      
      const response = await fetch(`/api/sales/${saleId}/complete-execution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao concluir execução da venda");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", saleId] });
      toast({
        title: "Execução concluída",
        description: "A execução da venda foi concluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao concluir execução",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para marcar uma venda como corrigida (supervisor)
  const markAsCorrectedMutation = useMutation({
    mutationFn: async () => {
      if (!saleId) throw new Error("ID da venda não fornecido");
      
      const response = await fetch(`/api/sales/${saleId}/mark-as-corrected`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao marcar venda como corrigida");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", saleId] });
      toast({
        title: "Venda marcada como corrigida",
        description: "A venda foi marcada como corrigida e está disponível para o operacional",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao marcar venda como corrigida",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para devolver a venda para o vendedor
  const returnToSellerMutation = useMutation({
    mutationFn: async () => {
      if (!saleId) throw new Error("ID da venda não fornecido");
      if (!returnReason.trim()) throw new Error("É necessário informar o motivo da devolução");
      
      const response = await fetch(`/api/sales/${saleId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: returnReason }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao devolver venda para correção");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", saleId] });
      setReturnReason("");
      setIsReturning(false);
      toast({
        title: "Venda devolvida",
        description: "A venda foi devolvida para o vendedor para correções",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao devolver venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enriquecer dados da venda com nomes
  const enrichedSale = sale ? {
    ...sale,
    customerName: customers.find((c: any) => c.id === sale.customerId)?.name || `Cliente #${sale.customerId}`,
    sellerName: users.find((u: any) => u.id === sale.sellerId)?.username || `Vendedor #${sale.sellerId}`,
    serviceTypeName: serviceTypes.find((t: any) => t.id === sale.serviceTypeId)?.name || `Tipo #${sale.serviceTypeId}`,
  } : null;

  // Enriquecer itens com nomes dos serviços
  const enrichedItems = items.map((item: any) => ({
    ...item,
    serviceName: services.find((s: any) => s.id === item.serviceId)?.name || `Serviço #${item.serviceId}`,
  }));

  // Verificar se o usuário tem permissão para executar ações operacionais
  const canPerformOperations = user?.role === "admin" || user?.role === "operacional" || user?.role === "supervisor";
  
  console.log("Permissões do usuário:", {
    username: user?.username,
    role: user?.role,
    canPerformOperations,
    dialogSaleId: saleId
  });

  // Mutation para atualizar o tipo de execução quando a venda está em andamento
  const updateExecutionTypeMutation = useMutation({
    mutationFn: async () => {
      if (!saleId) throw new Error("ID da venda não fornecido");
      
      // Validação obrigatória: tipo de serviço precisa ser selecionado
      if (!selectedServiceTypeId) {
        throw new Error("É necessário selecionar um tipo de execução");
      }
      
      // Se o tipo de serviço for SINDICATO, o prestador parceiro é obrigatório
      const serviceType = serviceTypes.find((type: any) => type.id === selectedServiceTypeId);
      if (serviceType?.name === "SINDICATO" && !selectedServiceProviderId) {
        throw new Error("É necessário selecionar um prestador parceiro para execução via SINDICATO");
      }
      
      // Preparar dados para envio
      const requestData: any = {
        serviceTypeId: selectedServiceTypeId,
      };
      
      // Adicionar prestador parceiro apenas se selecionado
      if (selectedServiceProviderId) {
        requestData.serviceProviderId = selectedServiceProviderId;
      }
      
      const response = await fetch(`/api/sales/${saleId}/update-execution-type`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar tipo de execução");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", saleId] });
      toast({
        title: "Tipo de execução atualizado",
        description: "O tipo de execução da venda foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tipo de execução",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manipulador para ações baseadas no status da venda
  const handleMainAction = () => {
    if (!sale) return;
    
    if (sale.status === "pending" || sale.status === "corrected") {
      startExecutionMutation.mutate();
    } else if (sale.status === "in_progress") {
      completeExecutionMutation.mutate();
    }
  };
  
  // Manipulador para atualizar o tipo de execução
  const handleUpdateExecutionType = () => {
    if (sale) {
      // Verificação adicional de segurança: garantir que o prestador é selecionado se for SINDICATO
      const serviceType = serviceTypes.find((type: any) => type.id === selectedServiceTypeId);
      if (serviceType?.name === "SINDICATO" && !selectedServiceProviderId) {
        toast({
          title: "Prestador parceiro obrigatório",
          description: "Para execução via SINDICATO, selecione um prestador parceiro",
          variant: "destructive",
        });
        return;
      }
      
      updateExecutionTypeMutation.mutate();
    }
  };

  // Manipulador para devolver a venda
  const handleReturnSale = () => {
    if (returnReason.trim() === "") {
      toast({
        title: "Erro",
        description: "É necessário informar o motivo da devolução",
        variant: "destructive",
      });
      return;
    }
    
    returnToSellerMutation.mutate();
  };
  
  // Manipulador para marcar a venda como corrigida (supervisor)
  const handleMarkAsCorrected = () => {
    markAsCorrectedMutation.mutate();
  };

  // Efeito para inicializar o tipo de serviço quando a venda for carregada
  useEffect(() => {
    if (sale && serviceTypes.length > 0) {
      setSelectedServiceTypeId(sale.serviceTypeId);
      
      // Verificar se o tipo de serviço é SINDICATO
      const serviceType = serviceTypes.find((type: any) => type.id === sale.serviceTypeId);
      if (serviceType && serviceType.name === "SINDICATO") {
        setShowServiceProviderField(true);
        setSelectedServiceProviderId(sale.serviceProviderId || null);
      } else {
        setShowServiceProviderField(false);
        setSelectedServiceProviderId(null);
      }
    }
  }, [sale, serviceTypes]);

  // Manipulador para alterar o tipo de serviço
  const handleServiceTypeChange = (typeId: string) => {
    const id = parseInt(typeId);
    setSelectedServiceTypeId(id);
    
    // Verificar se o novo tipo selecionado é SINDICATO
    const serviceType = serviceTypes.find((type: any) => type.id === id);
    if (serviceType && serviceType.name === "SINDICATO") {
      setShowServiceProviderField(true);
    } else {
      setShowServiceProviderField(false);
      setSelectedServiceProviderId(null);
    }
  };

  // Manipulador para alterar o prestador de serviço
  const handleServiceProviderChange = (providerId: string) => {
    setSelectedServiceProviderId(parseInt(providerId));
  };
  
  // Limpar o estado quando o diálogo for fechado
  useEffect(() => {
    if (!open) {
      setReturnReason("");
      setIsReturning(false);
      setActiveTab("summary");
      setSelectedServiceTypeId(null);
      setSelectedServiceProviderId(null);
      setShowServiceProviderField(false);
    }
  }, [open]);

  // Renderizar componente
  const isLoading = saleLoading || itemsLoading || historyLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Tratativa da Venda #{enrichedSale?.orderNumber}</span>
            {enrichedSale && (
              <Badge variant={getStatusVariant(enrichedSale.status) as any}>
                {getStatusLabel(enrichedSale.status)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Acompanhe e gerencie o processo de execução desta venda
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <p>Carregando informações da venda...</p>
          </div>
        ) : !enrichedSale ? (
          <div className="flex justify-center items-center py-8">
            <p>Venda não encontrada</p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                <TabsTrigger value="execution">Execução</TabsTrigger>
                <TabsTrigger value="items">Itens</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
              
              {/* Tab de Resumo */}
              <TabsContent value="summary">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Informações Gerais</CardTitle>
                    <CardDescription>
                      Detalhes da venda e dados do cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Dados da Venda</h3>
                        <div className="grid gap-2">
                          <div className="flex justify-between items-center py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Nº OS:</span>
                            <span className="text-sm">{enrichedSale.orderNumber}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Data:</span>
                            <span className="text-sm">
                              {enrichedSale.date 
                                ? format(new Date(enrichedSale.date), 'dd/MM/yyyy', { locale: ptBR })
                                : format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Tipo de Serviço:</span>
                            <span className="text-sm">
                              {selectedServiceTypeId 
                                ? serviceTypes.find((t: any) => t.id === selectedServiceTypeId)?.name
                                : enrichedSale.serviceTypeName || "Não definido"}
                            </span>
                          </div>
                          {/* Se o tipo de serviço for SINDICATO, mostrar prestador parceiro */}
                          {(showServiceProviderField || enrichedSale.serviceProviderId) && (
                            <div className="flex justify-between items-center py-1 border-b border-border/60">
                              <span className="text-sm font-medium">Prestador Parceiro:</span>
                              <span className="text-sm">
                                {selectedServiceProviderId
                                  ? serviceProviders.find((p: any) => p.id === selectedServiceProviderId)?.name
                                  : enrichedSale.serviceProviderId
                                    ? serviceProviders.find((p: any) => p.id === enrichedSale.serviceProviderId)?.name || "Não identificado"
                                    : "Não selecionado"}
                              </span>
                            </div>
                          )}
                        
                          <div className="flex justify-between items-center py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Vendedor:</span>
                            <span className="text-sm">{enrichedSale.sellerName}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Cliente:</span>
                            <span className="text-sm">{enrichedSale.customerName}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Valor Total:</span>
                            <span className="text-sm font-bold">
                              R$ {parseFloat(enrichedSale.totalAmount).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Status e Observações</h3>
                        <div className="grid gap-4">
                          <div className="flex flex-col gap-1 py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Status de Execução:</span>
                            <div>
                              <Badge variant={getStatusVariant(enrichedSale.status) as any} className="ml-0">
                                {getStatusLabel(enrichedSale.status)}
                              </Badge>
                            </div>
                          </div>
                          
                          {enrichedSale.returnReason && (
                            <div className="flex flex-col gap-1 py-1 border-b border-border/60">
                              <span className="text-sm font-medium text-destructive">Motivo da Devolução:</span>
                              <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">
                                {enrichedSale.returnReason}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex flex-col gap-1 py-1 border-b border-border/60">
                            <span className="text-sm font-medium">Observações:</span>
                            <p className="text-sm p-2 bg-muted rounded">
                              {enrichedSale.notes || "Nenhuma observação registrada"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Tab de Execução */}
              <TabsContent value="execution">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Detalhes da Execução</CardTitle>
                    <CardDescription>
                      Informações sobre como o serviço será executado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Tipo de Execução */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Tipo de Execução</h3>
                        <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="h-5 w-5 text-primary" />
                            <span className="font-medium">
                              {selectedServiceTypeId 
                                ? serviceTypes.find((t: any) => t.id === selectedServiceTypeId)?.name
                                : enrichedSale.serviceTypeName || "Não definido"}
                            </span>
                          </div>
                          {(enrichedSale.status === "pending" || enrichedSale.status === "in_progress" || enrichedSale.status === "corrected") && canPerformOperations && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setActiveTab("summary")}
                              className="text-xs"
                            >
                              <Settings2 className="h-3 w-3 mr-1" />
                              Alterar
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Prestador Parceiro (se for SINDICATO) */}
                      {(showServiceProviderField || enrichedSale.serviceProviderId) && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium">Prestador de Serviço Parceiro</h3>
                          <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5 text-primary" />
                              <span className="font-medium">
                                {selectedServiceProviderId
                                  ? serviceProviders.find((p: any) => p.id === selectedServiceProviderId)?.name
                                  : enrichedSale.serviceProviderId
                                    ? serviceProviders.find((p: any) => p.id === enrichedSale.serviceProviderId)?.name || "Não identificado"
                                    : "Não selecionado"}
                              </span>
                            </div>
                            {(enrichedSale.status === "pending" || enrichedSale.status === "in_progress" || enrichedSale.status === "corrected") && 
                             showServiceProviderField && 
                             canPerformOperations && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setActiveTab("summary")}
                                className="text-xs"
                              >
                                <Settings2 className="h-3 w-3 mr-1" />
                                Alterar
                              </Button>
                            )}
                          </div>
                          {showServiceProviderField && !selectedServiceProviderId && (
                            <p className="text-xs text-destructive">
                              * É necessário selecionar um prestador parceiro para execução via SINDICATO
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Status atual */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Status Atual</h3>
                        <div className="bg-muted p-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusVariant(enrichedSale.status) as any} className="ml-0">
                              {getStatusLabel(enrichedSale.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {enrichedSale.status === "pending" && "Aguardando início da execução"}
                              {enrichedSale.status === "in_progress" && "Em processamento pelo operacional"}
                              {enrichedSale.status === "completed" && "Execução finalizada, aguardando financeiro"}
                              {enrichedSale.status === "returned" && "Devolvida para correção pelo vendedor"}
                              {enrichedSale.status === "corrected" && "Corrigida pelo vendedor, aguardando nova análise"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Tab de Itens */}
              <TabsContent value="items">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Itens da Venda</CardTitle>
                    <CardDescription>
                      Serviços inclusos nesta venda
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrichedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">
                              Nenhum item encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          enrichedItems.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium">{item.serviceName}</div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {item.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Tab de Histórico */}
              <TabsContent value="history">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Histórico de Status</CardTitle>
                    <CardDescription>
                      Registros de mudanças de status da venda
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statusHistory.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">Nenhum registro de histórico encontrado</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l border-border">
                        {statusHistory.map((record: any, index: number) => (
                          <div key={record.id} className="mb-4 relative">
                            <div className="absolute -left-[28px] h-8 w-8 bg-background rounded-full flex items-center justify-center border border-border">
                              {record.toStatus === "pending" && <Clock className="h-4 w-4 text-warning" />}
                              {record.toStatus === "in_progress" && <CornerDownRight className="h-4 w-4 text-secondary" />}
                              {record.toStatus === "completed" && <CheckCircle2 className="h-4 w-4 text-success" />}
                              {record.toStatus === "returned" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                              {record.toStatus === "corrected" && <FileCheck className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="bg-muted p-3 rounded">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <Badge variant={getStatusVariant(record.toStatus) as any} className="mb-1">
                                    {getStatusLabel(record.toStatus)}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground">
                                    Alterado de: {getStatusLabel(record.fromStatus)}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(record.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </p>
                              </div>
                              <p className="text-sm mt-1">
                                {record.notes || "Nenhuma observação"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Por: {users.find((u: any) => u.id === record.userId)?.username || `Usuário #${record.userId}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Configuração do tipo de execução quando pendente, em andamento ou corrigida */}
            {/* Botão para supervisor marcar venda como corrigida quando status é "returned" */}
            {console.log("OS 12 - Condição para exibir Card:", {
              canPerformOperations,
              isReturning,
              status: enrichedSale?.status,
              userRole: user?.role,
              showCard: canPerformOperations && !isReturning && enrichedSale?.status === "returned" && user?.role === "supervisor"
            })}
            {console.log("LOG CARD SUPERVISOR:", {
              status: sale?.status,
              userRole: user?.role,
              isReturning,
              canPerformOperations
            })}
            {sale?.status === "returned" && user?.role === "supervisor" && !isReturning && (
              <Card className="mt-6 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle>Marcar como Corrigida</CardTitle>
                  <CardDescription>
                    Marque esta venda como corrigida para continuar com o processamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Ao marcar esta venda como corrigida, ela será considerada pronta para processamento pelo setor operacional. 
                    Use esta função quando verificar que as correções necessárias foram implementadas.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleMarkAsCorrected}
                    disabled={markAsCorrectedMutation.isPending}
                  >
                    {markAsCorrectedMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Marcar como Corrigida
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}
            
            {canPerformOperations && !isReturning && (sale?.status === "pending" || sale?.status === "in_progress" || sale?.status === "corrected") && (
              <Card className="mt-6 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle>Configuração da Execução</CardTitle>
                  <CardDescription>
                    Defina como a venda será executada
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <Label htmlFor="service-type" className="text-sm font-medium mb-2 block">
                      Tipo de Execução
                    </Label>
                    <Select 
                      value={selectedServiceTypeId?.toString() || ''} 
                      onValueChange={handleServiceTypeChange}
                    >
                      <SelectTrigger id="service-type">
                        <SelectValue placeholder="Selecione o tipo de execução" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Mostrar campo para selecionar prestador de serviço quando for SINDICATO */}
                  {showServiceProviderField && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="service-provider" className="text-sm font-medium">
                          Prestador de Serviço Parceiro
                        </Label>
                        <span className="text-xs text-primary">* Obrigatório para SINDICATO</span>
                      </div>
                      <Select 
                        value={selectedServiceProviderId?.toString() || ''} 
                        onValueChange={handleServiceProviderChange}
                      >
                        <SelectTrigger id="service-provider">
                          <SelectValue placeholder="Selecione o prestador parceiro" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceProviders
                            .filter((provider: any) => provider.active)
                            .map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.id.toString()}>
                                {provider.name}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
                {sale?.status === "in_progress" && (
                  <CardFooter>
                    <Button
                      type="button"
                      onClick={handleUpdateExecutionType}
                      disabled={
                        updateExecutionTypeMutation.isPending || 
                        (showServiceProviderField && !selectedServiceProviderId)
                      }
                      className="w-full"
                    >
                      {updateExecutionTypeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <Settings2 className="mr-2 h-4 w-4" />
                          Atualizar Tipo de Execução
                        </>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}

            {isReturning ? (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-base font-medium">Devolver para o vendedor</h3>
                </div>
                <Textarea
                  placeholder="Informe o motivo da devolução..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="min-h-24"
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsReturning(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleReturnSale}
                    disabled={returnToSellerMutation.isPending || !returnReason.trim()}
                  >
                    {returnToSellerMutation.isPending ? "Enviando..." : "Devolver para Correção"}
                  </Button>
                </div>
              </div>
            ) : (
              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                {canPerformOperations && (
                  <>
                    {/* Botão para voltar */}
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                      className="mr-auto"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    
                    {/* Botão para devolver */}
                    {(sale?.status === "pending" || sale?.status === "in_progress") && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => setIsReturning(true)}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Devolver para Vendedor
                      </Button>
                    )}
                    
                    {/* Botão para supervisores reenviarem vendas devolvidas */}
                    {console.log("OS 12 - Condição para exibir Botão:", {
                      saleId: saleId,
                      saleStatus: sale?.status,
                      enrichedStatus: enrichedSale?.status,
                      userRole: user?.role,
                      userName: user?.username,
                      userId: user?.id,
                      showButton: sale?.status === "returned" && user?.role === "supervisor",
                      canPerformOperations: canPerformOperations
                    })}
                    {sale?.status === "returned" && user?.role === "supervisor" && (
                      <Button 
                        type="button"
                        variant="default"
                        onClick={handleMarkAsCorrected}
                        disabled={markAsCorrectedMutation.isPending}
                      >
                        <FileCheck className="mr-2 h-4 w-4" />
                        {markAsCorrectedMutation.isPending ? "Processando..." : "Reenviar Venda Corrigida"}
                      </Button>
                    )}
                    
                    {/* Botão para ação principal baseada no status */}
                    {(sale?.status === "pending" || sale?.status === "corrected") && (
                      <Button 
                        type="button" 
                        onClick={handleMainAction}
                        disabled={
                          startExecutionMutation.isPending || 
                          (showServiceProviderField && !selectedServiceProviderId) ||
                          !selectedServiceTypeId
                        }
                        className={sale?.status === "corrected" ? "bg-primary hover:bg-primary/90" : ""}
                        title={showServiceProviderField && !selectedServiceProviderId 
                          ? "É necessário selecionar um prestador parceiro para execução via SINDICATO" 
                          : !selectedServiceTypeId 
                            ? "É necessário selecionar um tipo de execução"
                            : ""}
                      >
                        <CornerDownRight className="mr-2 h-4 w-4" />
                        {startExecutionMutation.isPending ? "Iniciando..." : "Iniciar Execução"}
                      </Button>
                    )}
                    
                    {sale?.status === "in_progress" && (
                      <Button 
                        type="button" 
                        onClick={handleMainAction}
                        disabled={completeExecutionMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {completeExecutionMutation.isPending ? "Concluindo..." : "Concluir Execução"}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}