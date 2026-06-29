import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import './App.css';

Chart.register(...registerables);

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('nodeRedApiUrl') || '');
  const [inputUrl, setInputUrl] = useState(apiBaseUrl);
  const [isDemoMode, setIsDemoMode] = useState(!apiBaseUrl);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Diagnósticos de Sistema
  const [latency, setLatency] = useState(0);
  const [espRam, setEspRam] = useState(192);
  const [uptime, setUptime] = useState('00h 00m 00s');

  // Tipo de vehículo activo para la animación
  const [activeVehicle, setActiveVehicle] = useState('sports'); // sports, suv, truck, motorcycle

  // Estado del Dashboard
  const [stats, setStats] = useState({
    todayCount: 24,
    totalCount: 189,
    gateState: "CERRADA",
    lightState: "ROJO",
    lastDistance: 148,
    hourlyTraffic: [3, 1, 2, 5, 8, 6, 2, 1, 3, 4, 2, 1], // Últimas 12 horas
    logs: [
      { time: "2026-06-15 14:10:25", event: "Auto Detectado", distance: "25 cm", state: "ABIERTA" },
      { time: "2026-06-15 14:10:35", event: "Barrera Cerrada", distance: "185 cm", state: "CERRADA" },
      { time: "2026-06-15 14:45:12", event: "Auto Detectado", distance: "18 cm", state: "ABIERTA" },
      { time: "2026-06-15 14:45:22", event: "Barrera Cerrada", distance: "160 cm", state: "CERRADA" },
      { time: "2026-06-15 15:02:01", event: "Auto Detectado", distance: "12 cm", state: "ABIERTA" },
      { time: "2026-06-15 15:02:11", event: "Barrera Cerrada", distance: "172 cm", state: "CERRADA" },
    ]
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const startTime = useRef(Date.now());

  // EFECTO: Uptime del sistema y latencia simulada
  useEffect(() => {
    const interval = setInterval(() => {
      // Calcular Uptime
      const diff = Date.now() - startTime.current;
      const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setUptime(`${hrs}h ${mins}m ${secs}s`);

      // Latencia aleatoria simulada si está en demo
      if (isDemoMode) {
        setLatency(Math.floor(Math.random() * 15) + 5);
        setEspRam(prev => {
          const shift = Math.floor(Math.random() * 5) - 2;
          const next = prev + shift;
          return next > 210 ? 210 : next < 180 ? 180 : next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoMode]);

  // EFECTO: Cambiar tipo de vehículo aleatorio cuando la barrera se abre
  useEffect(() => {
    if (stats.gateState === "ABIERTA") {
      const vehicles = ['sports', 'suv', 'truck', 'motorcycle'];
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      setActiveVehicle(randomVehicle);
    }
  }, [stats.gateState]);

  // EFECTO: Inicialización y actualización de gráficos
  useEffect(() => {
    if (!chartRef.current) return;

    // Generar horas del eje X
    const hours = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const h = new Date(now.getTime() - (i * 60 * 60 * 1000));
      hours.push(h.getHours() + ":00");
    }

    const ctx = chartRef.current.getContext('2d');
    
    // Crear gradiente de color para las barras
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 250);
    gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.65)');  // Azul brillante arriba
    gradientFill.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)'); // Púrpura medio
    gradientFill.addColorStop(1, 'rgba(139, 92, 246, 0.02)');  // Desvanecido abajo

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [{
          label: 'Autos detectados',
          data: stats.hourlyTraffic,
          backgroundColor: gradientFill,
          borderColor: 'rgba(59, 130, 246, 0.9)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(16, 185, 129, 0.8)',
          hoverBorderColor: '#10b981',
          shadowColor: 'rgba(59, 130, 246, 0.4)',
          shadowBlur: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.04)'
            },
            ticks: {
              color: '#94a3b8',
              stepSize: 1,
              font: {
                family: 'Outfit'
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: 'Outfit'
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [stats.hourlyTraffic]);

  // EFECTO: Motor de Simulación Modo Demo
  useEffect(() => {
    if (!isDemoMode) return;

    const simInterval = setInterval(() => {
      if (Math.random() < 0.25) {
        const randomDistance = Math.floor(Math.random() * 22) + 4; // 4 a 26 cm
        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

        // Abrir barrera (Verde)
        setStats(prev => {
          const newTraffic = [...prev.hourlyTraffic];
          newTraffic[11] += 1;
          
          return {
            ...prev,
            todayCount: prev.todayCount + 1,
            totalCount: prev.totalCount + 1,
            gateState: "ABIERTA",
            lightState: "VERDE",
            lastDistance: randomDistance,
            hourlyTraffic: newTraffic,
            logs: [...prev.logs, {
              time: timeStr,
              event: "VERDE: Auto Detectado",
              distance: `${randomDistance} cm`,
              state: "ABIERTA"
            }]
          };
        });

        // Cambiar a Amarillo a los 3 segundos
        setTimeout(() => {
          setStats(prev => {
            if (prev.gateState !== "ABIERTA") return prev;
            const yellowTime = new Date();
            const yellowTimeStr = yellowTime.toISOString().replace('T', ' ').substring(0, 19);
            return {
              ...prev,
              lightState: "AMARILLO",
              logs: [...prev.logs, {
                time: yellowTimeStr,
                event: "AMARILLO: Bajando barrera lentamente",
                distance: `${prev.lastDistance} cm`,
                state: "ABIERTA"
              }]
            };
          });
        }, 3000);

        // Cerrar barrera (Rojo) a los 8 segundos (dando 5 segundos para el amarillo)
        setTimeout(() => {
          setStats(prev => {
            const closeTime = new Date();
            const closeTimeStr = closeTime.toISOString().replace('T', ' ').substring(0, 19);
            const safeDistance = Math.floor(Math.random() * 100) + 120;

            return {
              ...prev,
              gateState: "CERRADA",
              lightState: "ROJO",
              lastDistance: safeDistance,
              logs: [...prev.logs, {
                time: closeTimeStr,
                event: "ROJO: Barrera Cerrada",
                distance: `${safeDistance} cm`,
                state: "CERRADA"
              }]
            };
          });
        }, 8000);
      }
    }, 12000);

    return () => clearInterval(simInterval);
  }, [isDemoMode]);

  // EFECTO: Polling Node-RED
  useEffect(() => {
    if (isDemoMode || !apiBaseUrl) return;

    const fetchData = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch(apiBaseUrl);
        if (!res.ok) throw new Error('Servidor offline');
        const data = await res.json();
        
        const t1 = performance.now();
        setLatency(Math.round(t1 - t0));
        
        setStats(data);
        setIsConnected(true);
        setErrorMsg('');
      } catch (err) {
        console.error(err);
        setIsConnected(false);
        setLatency(0);
        setErrorMsg('Error de enlace con Node-RED (Reintentando...)');
      }
    };

    fetchData();
    const pollInterval = setInterval(fetchData, 3000);

    return () => clearInterval(pollInterval);
  }, [isDemoMode, apiBaseUrl]);

  // Manual Override (Acciones en tiempo real conectadas a Node-RED)
  const handleManualTrigger = async (state) => {
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

    // Actualizar estado local inmediatamente para feedback visual rápido
    setStats(prev => {
      let gateState = prev.gateState;
      if (state === "ABIERTA") gateState = "ABIERTA";
      if (state === "CERRADA") gateState = "CERRADA";
      
      return {
        ...prev,
        gateState: gateState,
        lastDistance: state === "ABIERTA" ? 12 : state === "CERRADA" ? 168 : prev.lastDistance,
        logs: [...prev.logs, {
          time: timeStr,
          event: state === "ABIERTA" ? "Apertura Manual" : state === "CERRADA" ? "Cierre Manual" : "Modo Automático",
          distance: state === "ABIERTA" ? "12 cm" : state === "CERRADA" ? "168 cm" : "--",
          state: state === "ABIERTA" ? "ABIERTA" : state === "CERRADA" ? "CERRADA" : prev.gateState
        }]
      };
    });

    // Si no estamos en modo demo y hay una URL de API, enviar comando a Node-RED
    if (!isDemoMode && apiBaseUrl) {
      try {
        const commandUrl = apiBaseUrl.replace('/api/datos', '/api/comando');
        const response = await fetch(commandUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ comando: state })
        });
        if (!response.ok) throw new Error('Error al enviar el comando al servidor');
      } catch (err) {
        console.error('Error al enviar comando manual:', err);
        setErrorMsg('Error al enviar comando a la barrera fisica: ' + err.message);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      localStorage.setItem('nodeRedApiUrl', inputUrl.trim());
      setApiBaseUrl(inputUrl.trim());
      setIsDemoMode(false);
      setErrorMsg('');
    }
  };

  const handleToggleDemo = () => {
    if (isDemoMode) {
      if (apiBaseUrl) {
        setIsDemoMode(false);
      } else {
        alert("Configura un Endpoint de Node-RED primero para salir del Modo Demo.");
      }
    } else {
      setIsDemoMode(true);
      setIsConnected(false);
    }
  };

  const handleResetData = async () => {
    const confirmReset = window.confirm("¿Estás seguro de reiniciar todos los datos a cero? Esto borrará el historial y los contadores en la aplicación y en el servidor.");
    if (!confirmReset) return;

    const initialStats = {
      todayCount: 0,
      totalCount: 0,
      gateState: "CERRADA",
      lightState: "ROJO",
      lastDistance: 150,
      hourlyTraffic: Array(12).fill(0),
      logs: []
    };

    // Actualizar localmente de inmediato
    setStats(initialStats);

    // Enviar comando de reinicio al servidor si no estamos en demo y tenemos URL de API
    if (!isDemoMode && apiBaseUrl) {
      try {
        const resetUrl = apiBaseUrl.replace('/api/datos', '/api/reset');
        const response = await fetch(resetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Error al reiniciar los datos del servidor');
        alert("Datos del sistema físico reiniciados correctamente en Node-RED.");
      } catch (err) {
        console.error('Error al reiniciar datos:', err);
        setErrorMsg('Error al reiniciar los datos del servidor: ' + err.message);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    }
  };

  // Renderizador de SVG de Vehículo Dinámico
  const renderVehicleSVG = () => {
    switch (activeVehicle) {
      case 'suv':
        return (
          <svg viewBox="0 0 100 60" width="75" height="45">
            <path d="M5 38 L10 24 Q12 18 18 18 L68 18 Q72 18 75 22 L84 35 L93 35 Q96 35 96 38 L96 46 Q96 49 93 49 L88 49 Q86 43 80 43 Q74 43 72 49 L28 49 Q26 43 20 43 Q14 43 12 49 L7 49 Q5 49 5 46 Z" fill="#10b981" filter="drop-shadow(0 0 10px rgba(16, 185, 129, 0.7))" />
            <circle cx="20" cy="49" r="8" fill="#05070f" stroke="#10b981" strokeWidth="2" />
            <circle cx="80" cy="49" r="8" fill="#05070f" stroke="#10b981" strokeWidth="2" />
            <rect x="20" y="22" width="22" height="13" fill="#05070f" rx="2" />
            <rect x="46" y="22" width="22" height="13" fill="#05070f" rx="2" />
            <circle cx="92" cy="38" r="2.5" fill="#fef08a" />
          </svg>
        );
      case 'truck':
        return (
          <svg viewBox="0 0 100 60" width="80" height="48">
            <path d="M5 32 L5 13 Q5 10 8 10 L63 10 L63 32 Z" fill="#c084fc" filter="drop-shadow(0 0 10px rgba(168, 85, 247, 0.7))" />
            <path d="M63 20 L74 20 Q77 20 79 23 L86 32 L92 34 Q95 35 95 38 L95 48 Q95 50 93 50 L87 50 Q86 44 80 44 Q74 44 73 50 L25 50 Q24 44 18 44 Q12 44 11 50 L7 50 Q5 50 5 48 L5 32 Z" fill="#8b5cf6" filter="drop-shadow(0 0 10px rgba(139, 92, 246, 0.7))" />
            <circle cx="18" cy="50" r="8" fill="#05070f" stroke="#a855f7" strokeWidth="2" />
            <circle cx="80" cy="50" r="8" fill="#05070f" stroke="#a855f7" strokeWidth="2" />
            <rect x="67" y="23" width="12" height="9" fill="#05070f" rx="1" />
            <circle cx="92" cy="37" r="2.5" fill="#fef08a" />
          </svg>
        );
      case 'motorcycle':
        return (
          <svg viewBox="0 0 100 60" width="60" height="38">
            <circle cx="25" cy="45" r="11" fill="#05070f" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="75" cy="45" r="11" fill="#05070f" stroke="#f59e0b" strokeWidth="3" />
            <path d="M25 45 L42 32 L58 32 L75 45 M42 32 L50 15 L55 22 M58 32 L52 45" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" filter="drop-shadow(0 0 10px rgba(245, 158, 11, 0.7))" />
            <circle cx="48" cy="12" r="6" fill="#f59e0b" />
            <path d="M48 18 Q45 25 42 32 L52 32 Q54 26 50 18" fill="#f59e0b" />
            <circle cx="80" cy="38" r="2.5" fill="#fef08a" />
          </svg>
        );
      case 'sports':
      default:
        return (
          <svg viewBox="0 0 100 60" width="75" height="45">
            <path d="M15 35 L20 20 Q23 15 28 15 L72 15 Q77 15 80 20 L88 35 L92 37 Q95 38 95 41 L95 48 Q95 50 93 50 L87 50 Q86 45 81 45 Q76 45 75 50 L25 50 Q24 45 19 45 Q14 45 13 50 L7 50 Q5 50 5 48 L5 41 Q5 38 8 37 Z" fill="#3b82f6" filter="drop-shadow(0 0 10px rgba(59, 130, 246, 0.7))" />
            <circle cx="19" cy="50" r="7" fill="#05070f" stroke="#3b82f6" strokeWidth="2" />
            <circle cx="81" cy="50" r="7" fill="#05070f" stroke="#3b82f6" strokeWidth="2" />
            <rect x="25" y="20" width="20" height="12" fill="#05070f" rx="2" />
            <rect x="50" y="20" width="22" height="12" fill="#05070f" rx="2" />
            <circle cx="90" cy="40" r="2" fill="#fef08a" />
          </svg>
        );
    }
  };

  return (
    <div className="app-wrapper">
      <header>
        <div className="logo-container">
          <div className="logo-icon">🚗</div>
          <div>
            <h1 className="hologram-text">MECANISMO DE ACCESO VEHICULAR</h1>
            <p className="subtitle">Consola de Control de Tránsito</p>
          </div>
        </div>
        <div className={`status-badge ${isDemoMode ? 'demo-active' : isConnected ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>
            {isDemoMode ? 'Modo Demo Activo' : isConnected ? 'Enlace Conectado' : 'Sin Señal'}
          </span>
        </div>
      </header>

      <main>
        {/* PANEL CONFIGURACIÓN */}
        <section className="config-card">
          <form onSubmit={handleSaveConfig} className="config-form">
            <div className="config-group">
              <label htmlFor="url-input">Dirección IP Node-RED:</label>
              <input 
                type="text" 
                id="url-input" 
                placeholder="http://190.12.XX.XX:1880/api/datos"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">Conectar Servidor</button>
          </form>
          <div className="config-actions">
            <button 
              onClick={handleToggleDemo} 
              className={`btn btn-secondary ${isDemoMode ? 'active-demo-btn' : ''}`}
            >
              {isDemoMode ? 'Cambiar a Enlace Real' : 'Activar Simulación'}
            </button>
          </div>
        </section>

        {errorMsg && <div className="error-alert">{errorMsg}</div>}

        {/* METRICS GRID */}
        <section class="metrics-dashboard-grid">
          <div className="card-stat stat-blue">
            <div className="stat-label">Autos Registrados</div>
            <div className="stat-value">{stats.todayCount}</div>
            <div className="stat-desc">Contabilizados hoy</div>
          </div>
          
          <div className="card-stat stat-green">
            <div className="stat-label">Barrera Mecánica</div>
            <div className={`stat-value font-large ${stats.gateState === 'ABIERTA' ? 'text-green' : 'text-red'}`}>
              {stats.gateState}
            </div>
            <div className="stat-desc">Estado actual de la barra</div>
          </div>

          <div className="card-stat stat-orange">
            <div className="stat-label">Sensor Ultrasónico</div>
            <div className="stat-value">{stats.lastDistance} cm</div>
            <div className="stat-desc">Detección de distancia actual</div>
          </div>

          <div className="card-stat stat-purple">
            <div className="stat-label">Total Histórico</div>
            <div className="stat-value">{stats.totalCount}</div>
            <div className="stat-desc">Acumulado del sistema</div>
          </div>
        </section>

        {/* SISTEMA DE DIAGNÓSTICOS DEL SERVIDOR */}
        <section className="diagnostics-panel">
          <div className="diag-item">
            <span className="diag-dot dot-blue"></span>
            <span className="diag-label">Latencia de Red:</span>
            <span className="diag-val">{latency} ms</span>
          </div>
          <div className="diag-item">
            <span className="diag-dot dot-purple"></span>
            <span className="diag-label">Memoria Libre ESP32:</span>
            <span className="diag-val">{espRam} KB</span>
          </div>
          <div className="diag-item">
            <span className="diag-dot dot-green"></span>
            <span className="diag-label">Tiempo de Actividad (Uptime):</span>
            <span className="diag-val font-mono">{uptime}</span>
          </div>
          <div className="diag-item">
            <span className="diag-dot dot-orange"></span>
            <span className="diag-label">Densidad de Tránsito:</span>
            <span className={`diag-val badge-density ${stats.todayCount > 50 ? 'density-high' : stats.todayCount > 20 ? 'density-med' : 'density-low'}`}>
              {stats.todayCount > 50 ? 'ALTA' : stats.todayCount > 20 ? 'MEDIA' : 'BAJA'}
            </span>
          </div>
        </section>

        {/* MONITOR Y GRAFICO */}
        <section className="monitor-layout">
          {/* Panel Visualización Barrera */}
          <div className="panel-visual">
            <div className="visual-title">MONITOREO FÍSICO</div>
            
            {/* Brackets decorativos de esquina (Holograma style) */}
            <div className="hologram-bracket bracket-tl"></div>
            <div className="hologram-bracket bracket-tr"></div>
            <div className="hologram-bracket bracket-bl"></div>
            <div className="hologram-bracket bracket-br"></div>

            <div className="visual-elements">
              {/* Semáforo de 3 Luces (Físico) */}
              <div className="traffic-light">
                <div className={`light red ${stats.lightState === 'ROJO' || (stats.gateState === 'CERRADA' && stats.lightState !== 'AMARILLO') ? 'active' : ''}`}></div>
                <div className={`light yellow ${stats.lightState === 'AMARILLO' ? 'active' : ''}`}></div>
                <div className={`light green ${stats.lightState === 'VERDE' || (stats.gateState === 'ABIERTA' && stats.lightState !== 'AMARILLO') ? 'active' : ''}`}></div>
              </div>
              
              {/* Barrera */}
              <div className={`gate-container ${
                stats.gateState === 'ABIERTA' && stats.lightState !== 'AMARILLO' ? 'open' : 
                stats.gateState === 'CERRANDO' || stats.lightState === 'AMARILLO' ? 'closing' : ''
              }`}>
                <div className="gate-post"></div>
                <div className="gate-arm"></div>
              </div>

              {/* Render de Vehículo SVG Aleatorio */}
              <div className="car-visual-overlay">
                {renderVehicleSVG()}
              </div>
            </div>

            <div className="visual-display-status">
              <div className={`visual-status-text ${
                stats.gateState === 'ABIERTA' && stats.lightState !== 'AMARILLO' ? 'text-green' : 
                stats.gateState === 'CERRANDO' || stats.lightState === 'AMARILLO' ? 'text-orange' : 'text-red'
              }`}>
                {
                  stats.gateState === 'ABIERTA' && stats.lightState !== 'AMARILLO' ? 'ACCESO AUTORIZADO' : 
                  stats.gateState === 'CERRANDO' || stats.lightState === 'AMARILLO' ? 'BAJANDO BARRERA' : 'ACCESO DENEGADO'
                }
              </div>
            </div>

            {/* Controles de Anulación Manual */}
            <div className="manual-controls">
              <span className="manual-title">Sobrescribir Barrera:</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                  onClick={() => handleManualTrigger('ABIERTA')} 
                  className="btn-manual btn-open"
                >
                  ABRIR
                </button>
                <button 
                  onClick={() => handleManualTrigger('CERRADA')} 
                  className="btn-manual btn-close"
                >
                  CERRAR
                </button>
                <button 
                  onClick={() => handleManualTrigger('AUTO')} 
                  className="btn-manual btn-auto"
                >
                  AUTO
                </button>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="panel-charts">
            <div className="chart-header">
              <div className="chart-title">Vehículos por Hora (Último Turno)</div>
              <div className="chart-subtitle">Registrado mediante sensor ultrasónico</div>
            </div>
            <div className="chart-canvas-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </section>

        {/* REGISTROS RECIENTES */}
        <section className="panel-logs">
          <div className="logs-header">
            <div className="chart-title">Consola de Eventos Recientes</div>
            <button onClick={handleResetData} className="btn btn-clear" style={{ background: 'var(--color-red)', color: 'white', borderColor: 'var(--color-red)' }}>
              Reiniciar Datos
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Marca de Tiempo</th>
                  <th>Tipo de Evento</th>
                  <th>Distancia de Lectura</th>
                  <th>Barrera Física</th>
                </tr>
              </thead>
              <tbody>
                {stats.logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-table-cell">
                      No hay registros de eventos en la consola de Node-RED.
                    </td>
                  </tr>
                ) : (
                  [...stats.logs].reverse().slice(0, 10).map((log, index) => (
                    <tr key={index}>
                      <td className="font-mono">{log.time}</td>
                      <td>
                        <span className={`event-text-label ${log.event.includes('Manual') ? 'text-purple' : ''}`}>
                          {log.event}
                        </span>
                      </td>
                      <td className="font-mono">{log.distance}</td>
                      <td>
                        <span className={`badge-table ${log.state === 'ABIERTA' ? 'open' : 'closed'}`}>
                          {log.state}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer>
        <p>CONSOLA DE MONITOREO VEHICULAR V2.5 // ESP32 + NODE-RED // ELASTIKA VPS</p>
      </footer>
    </div>
  );
}

export default App;
