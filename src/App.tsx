import { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  Text,
  Input,
  Button,
  VStack,
  Progress,
  Card,
  HStack,
  Badge,
  Spinner
} from "@chakra-ui/react";
import { FiCamera, FiFileText, FiUpload, FiCheckCircle, FiSearch, FiAlertCircle } from "react-icons/fi";

// ==========================================
// FUNCIÓN AUXILIAR: COMPRESIÓN DE IMÁGENES
// ==========================================
const comprimirImagen = (file: File, maxAncho = 1600, calidad = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxAncho) {
            height = Math.round((height * maxAncho) / width);
            width = maxAncho;
          }
        } else {
          if (height > maxAncho) {
            width = Math.round((width * maxAncho) / height);
            height = maxAncho;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileComprimido = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(fileComprimido);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          calidad
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface VehiculoInfo {
  marca: string;
  modelo: string;
  cliente: string;
}

interface CustomToast {
  id: string;
  title: string;
  description?: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

function App() {
  // ==========================================
  // SISTEMA DE TOASTS PERSONALIZADO (COMPATIBILIDAD V3)
  // ==========================================
  const [toasts, setToasts] = useState<CustomToast[]>([]);

  const toast = ({ title, description, status, duration = 4000 }: {
    title: string;
    description?: string;
    status: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    isClosable?: boolean;
  }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, status }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // ==========================================
  // DETECCIÓN DE ROL POR URL (Mecánico o Jefe)
  // ==========================================
  const queryParams = new URLSearchParams(window.location.search);
  const rol = queryParams.get('rol') || 'mecanico'; // Por defecto es mecánico

  // ==========================================
  // ESTADOS COMUNES DE VALIDACIÓN
  // ==========================================
  const [patente, setPatente] = useState<string>('');
  const [vehiculoValidado, setVehiculoValidado] = useState<boolean>(false);
  const [vehiculoInfo, setVehiculoInfo] = useState<VehiculoInfo | null>(null);
  const [errors, setErrors] = useState<{ patente?: string }>({});
  const [isValiding, setIsValidating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mensajeProgreso, setMensajeProgreso] = useState<string>('');
  const [porcentajeCarga, setPorcentajeCarga] = useState<number>(0);

  // ==========================================
  // ESTADOS FORMULARIO 1: MECÁNICOS (FOTOS)
  // ==========================================
  const [tipoEvidencia, setTipoEvidencia] = useState<string>('PRE'); 
  const [fotosOriginales, setFotosOriginales] = useState<FileList | null>(null);

  // ==========================================
  // ESTADOS FORMULARIO 2: TÉCNICOS (DIAGNOSTICOS PDF)
  // ==========================================
  const [diagInicial, setDiagInicial] = useState<File | null>(null);
  const [diagFinal, setDiagFinal] = useState<File | null>(null);

  // Manejo del cambio de patente
  const handlePatenteChange = (e: any) => {
    const valorLimpio = e.target.value.replace(/\s+/g, '').toUpperCase();
    setPatente(valorLimpio);
    setVehiculoValidado(false);
    setVehiculoInfo(null);
    setFotosOriginales(null);
    setDiagInicial(null);
    setDiagFinal(null);
    if (errors.patente) {
      setErrors((prev) => ({ ...prev, patente: undefined }));
    }
  };

  // ==========================================
  // PASO 1: VALIDACIÓN (MODO DEMO PARA TU JEFE)
  // ==========================================
  // ==========================================
  // PASO 1: VALIDACIÓN (CONEXIÓN A N8N) - CORREGIDO
  // ==========================================
  const validarVehiculo = async () => {
    // La función DEBE empezar aquí
    if (!patente.trim()) {
      setErrors({ patente: "Debes ingresar una patente." });
      return;
    }
    
    setIsValidating(true);
    
    try {
      // AQUÍ ES DONDE OCURRE LA MAGIA: CONECTAMOS CONtu N8N
      // Cuando tengas la URL real de tu n8n, reemplázala aquí:
      const respuesta = await axios.post("https://johaparr.app.n8n.cloud/webhook-test/validar-vehiculo", { 
        patente: patente 
      });

      // Si n8n responde que el vehículo existe, actualizamos el formulario
      setVehiculoValidado(true);
      
      // Asumimos que n8n devuelve {marca, modelo, cliente} en la respuesta
      setVehiculoInfo(respuesta.data); 
      setIsValidating(false);
      
      toast({
        title: "Vehículo Encontrado",
        description: "Se han desbloqueado las opciones de carga.",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      // Si hay un error de conexión o la patente no existe
      console.error("Error al validar patente:", error);
      setIsValidating(false);
      toast({
        title: "Error de Validación",
        description: "No se pudo conectar con el sistema. Verifica la patente.",
        status: "error",
        duration: 4000,
      });
    }
  }; // <--- La función DEBE terminar aquí, al final de todo el bloque

  // ==========================================
  // ENVÍO FORMULARIO 1: FOTOS
  // ==========================================
  const handleSubmitFotos = async (e: any) => {
    e.preventDefault();

    if (!vehiculoValidado) {
      toast({ title: "Seguridad Bloqueada", description: "Primero debes validar la patente.", status: "error", duration: 4000 });
      return;
    }
    if (!fotosOriginales || fotosOriginales.length === 0) {
      toast({ title: "Faltan fotos", description: "Selecciona al menos una foto.", status: "warning", duration: 4000 });
      return;
    }

    setIsLoading(true);
    setPorcentajeCarga(5);

    try {
      setMensajeProgreso("Optimizando y comprimiendo imágenes localmente...");
      const formData = new FormData();
      formData.append("patente", patente);
      formData.append("tipo_evidencia", tipoEvidencia);

      for (let i = 0; i < fotosOriginales.length; i++) {
        const imgComprimida = await comprimirImagen(fotosOriginales[i]);
        formData.append("fotos", imgComprimida, tipoEvidencia.toLowerCase() + "_" + patente + "_" + i + ".jpg");
        setPorcentajeCarga(Math.round(5 + (i + 1) * (55 / fotosOriginales.length)));
      }

      setMensajeProgreso("Subiendo fotos clasificadas...");
      const respuesta = await axios.post("https://tu-n8n-instancia.com/webhook/autoflow-registro", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const avanceRed = Math.round((progressEvent.loaded * 40) / progressEvent.total);
            setPorcentajeCarga(60 + avanceRed);
          }
        }
      });

      if (respuesta.status === 200 || respuesta.status === 201 || respuesta.status === 202) {
        toast({ title: "¡Fotos Cargadas!", description: "Las imágenes se asociaron correctamente.", status: "success", duration: 5000 });
        resetearFormulario();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error en la carga", description: "No se pudo completar el envío.", status: "error", duration: 5000 });
    } finally {
      setIsLoading(false);
      setPorcentajeCarga(0);
      setMensajeProgreso('');
    }
  };

  // ==========================================
  // ENVÍO FORMULARIO 2: DIAGNÓSTICOS PDF
  // ==========================================
  const handleSubmitDiagnosticos = async (e: any) => {
    e.preventDefault();

    if (!vehiculoValidado) {
      toast({ title: "Seguridad Bloqueada", description: "Primero debes validar la patente.", status: "error", duration: 4000 });
      return;
    }
    if (!diagInicial && !diagFinal) {
      toast({ title: "Archivos vacíos", description: "Debes cargar al menos un diagnóstico (Inicial o Final).", status: "warning", duration: 4000 });
      return;
    }

    setIsLoading(true);
    setPorcentajeCarga(10);

    try {
      setMensajeProgreso("Estructurando archivos diagnósticos para envío seguro...");
      const formData = new FormData();
      formData.append("patente", patente);

      if (diagInicial) {
        formData.append("diagnostico_inicial", diagInicial, "inicial_" + patente + ".pdf");
      }
      if (diagFinal) {
        formData.append("diagnostico_final", diagFinal, "final_" + patente + ".pdf");
      }
      setPorcentajeCarga(40);

      setMensajeProgreso("Subiendo archivos PDF de escáner a WordPress...");
      const respuesta = await axios.post("https://tu-n8n-instancia.com/webhook/autoflow-diagnosticos", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const avanceRed = Math.round((progressEvent.loaded * 60) / progressEvent.total);
            setPorcentajeCarga(40 + avanceRed);
          }
        }
      });

      if (respuesta.status === 200 || respuesta.status === 201 || respuesta.status === 202) {
        toast({ title: "¡Diagnósticos Registrados!", description: "Los reportes PDF se cargaron exitosamente.", status: "success", duration: 5000 });
        resetearFormulario();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error en la carga", description: "Error al transmitir los reportes PDF.", status: "error", duration: 5000 });
    } finally {
      setIsLoading(false);
      setPorcentajeCarga(0);
      setMensajeProgreso('');
    }
  };

  const resetearFormulario = () => {
    setPatente('');
    setVehiculoValidado(false);
    setVehiculoInfo(null);
    setFotosOriginales(null);
    setDiagInicial(null);
    setDiagFinal(null);
    setTipoEvidencia('PRE');
    const inputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => { input.value = ''; });
  };

  return (
    <Box 
      minH="100vh" 
      style={{ background: 'linear-gradient(to bottom right, #020617, #0f172a, #020617)' }}
      color="white" 
      py={8} 
      px={4}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Card.Root 
        w="full" 
        maxW="650px" 
        bg="rgba(15, 23, 42, 0.85)" 
        backdropFilter="blur(16px)"
        border="1px solid rgba(255, 255, 255, 0.08)"
        borderRadius="2xl" 
        boxShadow="2xl"
      >
        <Card.Body p={{ base: 6, md: 8 }}>
          
          {/* Header del Portal de ElectroCar */}
          <VStack gap={1} align="center" textAlign="center" mb={6}>
            <HStack gap={2}>
              <Box color="blue.400" fontSize="24px" display="inline-flex">
                {rol === 'jefe' ? <FiFileText /> : <FiCamera />}
              </Box>
              <Heading size="lg" bgGradient="linear(to-r, blue.400, teal.300)" bgClip="text">
                {rol === 'jefe' ? 'Portal Diagnósticos' : 'Portal Evidencias'}
              </Heading>
              <Badge colorPalette={rol === 'jefe' ? 'purple' : 'teal'} variant="solid" borderRadius="full" px={2}>
                {rol === 'jefe' ? 'Jefe / Técnico' : 'Mecánicos'}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="gray.400">
              ElectroCar - Registro y Control de Calidad
            </Text>
          </VStack>

          {/* Paso 1 Obligatorio de Validación */}
          <VStack gap={4} align="stretch" mb={6}>
            <VStack align="stretch" gap={2}>
              <Text fontSize="sm" fontWeight="bold" color="blue.300">
                1. Validación de Patente del Vehículo <Text as="span" color="red.500">*</Text>
              </Text>
              <HStack gap={2}>
                <Input
                  placeholder="Ej: AB123CD"
                  value={patente}
                  onChange={handlePatenteChange}
                  size="lg"
                  bg="rgba(255, 255, 255, 0.04)"
                  border="1px solid rgba(255, 255, 255, 0.12)"
                  _hover={{ borderColor: "blue.400" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  fontSize="xl"
                  fontWeight="black"
                  letterSpacing="widest"
                  textAlign="center"
                  maxLength={9}
                  disabled={isLoading || isValiding}
                  color="whiteAlpha.900"
                />
                {!vehiculoValidado && (
                  <Button
                    colorPalette="blue"
                    onClick={validarVehiculo}
                    loading={isValiding}
                    loadingText="Buscando..."
                    size="lg"
                    gap={2}
                  >
                    <FiSearch /> Validar
                  </Button>
                )}
              </HStack>
              {errors.patente && (
                <Text fontSize="sm" color="red.400" display="flex" alignItems="center" gap={1}>
                  <FiAlertCircle /> {errors.patente}
                </Text>
              )}
            </VStack>

            {/* Ficha Visual del Vehículo Encontrado (Custom Box - 100% Seguro) */}
            {vehiculoValidado && vehiculoInfo && (
              <Box
                borderRadius="xl"
                bg="rgba(48, 140, 122, 0.12)"
                border="1px solid rgba(48, 140, 122, 0.3)"
                p={4}
                textAlign="center"
              >
                <Box color="teal.300" mb={2} fontSize="28px" display="inline-flex">
                  <FiCheckCircle />
                </Box>
                <Text fontWeight="bold" fontSize="md" color="teal.200" mb={1}>
                  ¡Vehículo Verificado con Éxito!
                </Text>
                <Text fontSize="sm" color="gray.300">
                  🚗 <strong>{vehiculoInfo.marca} {vehiculoInfo.modelo}</strong> <br />
                  👤 Cliente: {vehiculoInfo.cliente}
                </Text>
              </Box>
            )}
          </VStack>

          {/* RENDERIZADO BASADO EN ROL */}
          {vehiculoValidado ? (
            rol === 'jefe' ? (
              // FORMULARIO N°2: SOLO PARA TU JEFE (PDFs)
              <VStack gap={6} align="stretch" as="form" onSubmit={handleSubmitDiagnosticos}>
                
                {/* Diagnóstico Inicial */}
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="bold" color="teal.300" display="flex" alignItems="center">
                    2. Diagnóstico Previo (PDF de Escáner)
                    <Badge ml={2} colorPalette="teal" variant="subtle">Inicial</Badge>
                  </Text>
                  <Box
                    border="2px dashed rgba(49, 151, 149, 0.3)"
                    borderRadius="lg"
                    p={5}
                    textAlign="center"
                    bg={diagInicial ? "rgba(49, 151, 149, 0.08)" : "transparent"}
                    _hover={{ bg: "rgba(255, 255, 255, 0.02)", cursor: "pointer" }}
                    transition="all 0.2s"
                    position="relative"
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      onChange={(e: any) => setDiagInicial(e.target.files ? e.target.files[0] : null)}
                      disabled={isLoading}
                    />
                    <VStack gap={1}>
                      <Box color="teal.300" fontSize="24px" display="inline-flex">
                        <FiFileText />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold">
                        {diagInicial ? "📄 " + diagInicial.name : "Seleccionar reporte PDF Inicial"}
                      </Text>
                      <Text fontSize="xx-small" color="gray.500">
                        Solo se aceptan archivos en formato PDF.
                      </Text>
                    </VStack>
                  </Box>
                </VStack>

                {/* Diagnóstico Final */}
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="bold" color="purple.300" display="flex" alignItems="center">
                    3. Diagnóstico Posterior (PDF de Escáner)
                    <Badge ml={2} colorPalette="purple" variant="subtle">Final</Badge>
                  </Text>
                  <Box
                    border="2px dashed rgba(159, 122, 234, 0.3)"
                    borderRadius="lg"
                    p={5}
                    textAlign="center"
                    bg={diagFinal ? "rgba(159, 122, 234, 0.08)" : "transparent"}
                    _hover={{ bg: "rgba(255, 255, 255, 0.02)", cursor: "pointer" }}
                    transition="all 0.2s"
                    position="relative"
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      onChange={(e: any) => setDiagFinal(e.target.files ? e.target.files[0] : null)}
                      disabled={isLoading}
                    />
                    <VStack gap={1}>
                      <Box color="purple.300" fontSize="24px" display="inline-flex">
                        <FiFileText />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold">
                        {diagFinal ? "📄 " + diagFinal.name : "Seleccionar reporte PDF Final"}
                      </Text>
                      <Text fontSize="xx-small" color="gray.500">
                        Solo se aceptan archivos en formato PDF.
                      </Text>
                    </VStack>
                  </Box>
                </VStack>

                {isLoading && (
                  <VStack gap={2} bg="rgba(0,0,0,0.2)" p={3} borderRadius="lg">
                    <HStack gap={2} w="full">
                      <Spinner size="xs" color="blue.400" />
                      <Text fontSize="xs" color="gray.300" noOfLines={1}>{mensajeProgreso}</Text>
                    </HStack>
                    <Progress.Root value={porcentajeCarga} size="sm" w="full" colorPalette="blue" striped animated>
                      <Progress.Track borderRadius="full">
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  </VStack>
                )}

                <Button
                  type="submit"
                  colorPalette="teal"
                  size="lg"
                  loading={isLoading}
                  loadingText="Cargando reportes..."
                  gap={2}
                >
                  <FiCheckCircle /> Enviar Diagnósticos
                </Button>
              </VStack>
            ) : (
              // FORMULARIO N°1: SOLO PARA MECÁNICOS (FOTOS)
              <VStack gap={6} align="stretch" as="form" onSubmit={handleSubmitFotos}>
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="bold" color="blue.300">
                    2. Selecciona Tipo de Evidencia <Text as="span" color="red.500">*</Text>
                  </Text>
                  <HStack gap={2} justify="center" w="full" flexWrap="wrap">
                    {[
                      { value: 'PRE', label: 'PRE Reparación', color: 'teal' },
                      { value: 'POST', label: 'POST Reparación', color: 'purple' },
                      { value: 'OBSERVACIONES', label: 'Observaciones', color: 'orange' },
                    ].map((opt) => {
                      const isSelected = tipoEvidencia === opt.value;
                      const activeColor = opt.color === 'teal' ? '#319795' : opt.color === 'purple' ? '#9F7AEA' : '#DD6B20';
                      return (
                        <Box
                          key={opt.value}
                          as="button"
                          type="button"
                          onClick={() => setTipoEvidencia(opt.value)}
                          flex={1}
                          py={3}
                          px={2}
                          borderRadius="xl"
                          border="2px solid"
                          borderColor={isSelected ? activeColor : 'rgba(255, 255, 255, 0.08)'}
                          bg={isSelected ? "rgba(" + (opt.color === 'teal' ? '49, 151, 149' : opt.color === 'purple' ? '159, 122, 234' : '221, 107, 32') + ", 0.15)" : 'rgba(255, 255, 255, 0.02)'}
                          color={isSelected ? activeColor : 'gray.400'}
                          _hover={{ bg: 'rgba(255, 255, 255, 0.05)', borderColor: isSelected ? undefined : 'rgba(255, 255, 255, 0.2)' }}
                          transition="all 0.2s"
                          fontWeight="bold"
                          fontSize="xs"
                          textAlign="center"
                          cursor="pointer"
                        >
                          <Badge colorPalette={opt.color} variant={isSelected ? "solid" : "subtle"} borderRadius="md" px={2} py={1}>
                            {opt.label}
                          </Badge>
                        </Box>
                      );
                    })}
                  </HStack>
                </VStack>

                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="bold" color="blue.300">
                    3. Adjuntar Fotografías de Evidencia <Text as="span" color="red.500">*</Text>
                  </Text>
                  <Box
                    border="2px dashed rgba(66, 153, 225, 0.3)"
                    borderRadius="lg"
                    p={6}
                    textAlign="center"
                    bg={fotosOriginales ? "rgba(66, 153, 225, 0.08)" : "transparent"}
                    _hover={{ bg: "rgba(255, 255, 255, 0.02)", cursor: "pointer" }}
                    transition="all 0.2s"
                    position="relative"
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      onChange={(e: any) => setFotosOriginales(e.target.files)}
                      disabled={isLoading}
                    />
                    <VStack gap={1}>
                      <Box color="blue.300" fontSize="24px" display="inline-flex">
                        <FiUpload />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold">
                        {fotosOriginales && fotosOriginales.length > 0 
                          ? "¡" + fotosOriginales.length + " foto(s) seleccionada(s)!" 
                          : "Presiona para abrir la cámara o seleccionar fotos"}
                      </Text>
                      <Text fontSize="xx-small" color="gray.500">
                        Las imágenes se comprimirán de manera transparente.
                      </Text>
                    </VStack>
                  </Box>
                </VStack>

                {isLoading && (
                  <VStack gap={2} bg="rgba(0,0,0,0.2)" p={3} borderRadius="lg">
                    <HStack gap={2} w="full">
                      <Spinner size="xs" color="blue.400" />
                      <Text fontSize="xs" color="gray.300" noOfLines={1}>{mensajeProgreso}</Text>
                    </HStack>
                    <Progress.Root value={porcentajeCarga} size="sm" w="full" colorPalette="blue" striped animated>
                      <Progress.Track borderRadius="full">
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  </VStack>
                )}

                <Button
                  type="submit"
                  colorPalette="blue"
                  size="lg"
                  loading={isLoading}
                  loadingText="Cargando evidencias..."
                  gap={2}
                >
                  <FiCheckCircle /> Enviar Evidencias
                </Button>
              </VStack>
            )
          ) : (
            // Mensaje de validación inicial seguro (Custom Box - 100% Seguro)
            <Box 
              borderRadius="xl" 
              bg="rgba(66, 153, 225, 0.06)" 
              border="1px solid rgba(66, 153, 225, 0.2)" 
              p={4}
              display="flex"
              alignItems="flex-start"
            >
              <Box color="blue.300" fontSize="20px" mr={3} mt="2px" display="inline-flex">
                <FiAlertCircle />
              </Box>
              <Text fontSize="sm" color="blue.200" textAlign="left">
                Por favor, ingresa la patente del vehículo y haz clic en <strong>Validar</strong> para desbloquear las opciones de carga.
              </Text>
            </Box>
          )}

        </Card.Body>
      </Card.Root>

      {/* Sistema de Toasts Personalizado */}
      <Box
        position="fixed"
        bottom="24px"
        right="24px"
        zIndex={9999}
        display="flex"
        flexDirection="column"
        gap="10px"
        maxW="400px"
        w="full"
        pointerEvents="none"
      >
        {toasts.map((t) => {
          const statusColors = {
            success: { bg: 'rgba(16, 185, 129, 0.95)', border: 'rgba(16, 185, 129, 0.3)', icon: FiCheckCircle, color: '#10B981' },
            error: { bg: 'rgba(239, 68, 68, 0.95)', border: 'rgba(239, 68, 68, 0.3)', icon: FiAlertCircle, color: '#EF4444' },
            warning: { bg: 'rgba(245, 158, 11, 0.95)', border: 'rgba(245, 158, 11, 0.3)', icon: FiAlertCircle, color: '#F59E0B' },
            info: { bg: 'rgba(59, 130, 246, 0.95)', border: 'rgba(59, 130, 246, 0.3)', icon: FiSearch, color: '#3B82F6' }
          };
          const config = statusColors[t.status] || statusColors.info;
          const IconComponent = config.icon;

          return (
            <Box
              key={t.id}
              pointerEvents="auto"
              bg="rgba(15, 23, 42, 0.9)"
              backdropFilter="blur(12px)"
              border="1px solid"
              borderColor={config.border}
              borderRadius="xl"
              p={4}
              boxShadow="xl"
              display="flex"
              alignItems="flex-start"
              gap={3}
              animation="slideIn 0.3s ease-out"
            >
              <Box color={config.color} fontSize="20px" mt="2px" display="inline-flex">
                <IconComponent />
              </Box>
              <Box flex={1}>
                <Text fontWeight="bold" fontSize="sm" color="white">
                  {t.title}
                </Text>
                {t.description && (
                  <Text fontSize="xs" color="gray.300" mt={1}>
                    {t.description}
                  </Text>
                )}
              </Box>
              <Box 
                as="button" 
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                color="gray.400"
                _hover={{ color: 'white' }}
                fontSize="xs"
                ml={2}
                cursor="pointer"
                border="none"
                background="transparent"
              >
                ✕
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default App;