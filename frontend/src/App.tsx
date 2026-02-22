import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import ReactFlow, { 
  Background, useNodesState, useEdgesState, addEdge, BackgroundVariant, SelectionMode, MarkerType,
  type Connection, type Edge, type Node, type NodeDragHandler, type NodeMouseHandler,
  type ReactFlowInstance
} from 'reactflow';
import axios from 'axios';
import { Plus, X, Users, Bell, Lock, Unlock, Home } from 'lucide-react'; 
import 'reactflow/dist/style.css'; 

// --- İÇ BİLEŞENLER ---
import LoginScreen from './components/LoginScreen'; 
import CyberNode from './nodes/CyberNode';
import Dashboard from './components/Dashboard';
import NotificationPanel from './components/NotificationPanel';
import TeamPanel from './components/TeamPanel';
import CreateTaskForm from './components/CreateTaskForm';
import TaskDetailPanel from './components/TaskDetailPanel';
import HubNode from './nodes/HubNode';

// --- TİPLER ---
import type { TaskData, UserData, UserStatus, NotificationData, DependencyData } from './types';

// Axios Ayarları
const savedToken = localStorage.getItem('auth_token');
if (savedToken) axios.defaults.headers.common['Authorization'] = `Token ${savedToken}`;

export default function App() {
  // --- 1. STATE VE HOOK TANIMLARI (HEPSİ BURADA OLMALI) ---
  
  // A) Temel Stateler
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>(""); 
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  
  // B) Graph Stateleri
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ cyber: CyberNode, hub: HubNode }), []); 
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null); 
  const [newTaskPos, setNewTaskPos] = useState<{x: number, y: number} | null>(null); 

  // C) UI Stateleri
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // DENEY MODU: Varsayılan olarak 'network' veya 'team' olsun, 'list' olmasın.
  const [sidebarMode, setSidebarMode] = useState<'create' | 'edit' | 'list' | 'team' | 'settings' | 'network'>('network');
  const [showDashboard, setShowDashboard] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false); 
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);

  // D) Veri Stateleri
  const [colleagues, setColleagues] = useState<UserData[]>([]);
  const [allTasks, setAllTasks] = useState<TaskData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [currentTaskData, setCurrentTaskData] = useState<TaskData | null>(null);

  // E) Ayarlar
  const [bgStyle, setBgStyle] = useState<'plain' | 'grid' | 'dots'>('plain');
  const [preferredStatus, setPreferredStatus] = useState<'online' | 'busy'>('online');

  // F) Refler ve Ses (ÖNEMLİ: Hook sırası bozulmamalı)
  const allTasksRef = useRef<TaskData[]>([]);
  const prevUnreadCountRef = useRef(0);
  const notificationSound = useMemo(() => new Audio('/notification.wav'), []);
  
  // Okunmamış sayısı (Render sırasında hesaplanır)
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // --- EFFECTLER (Hepsi burada toplanmalı) ---

  // 1. Ref Güncelleme
  useEffect(() => {
    allTasksRef.current = allTasks;
  }, [allTasks]);

  // 2. Ses ve Başlık Efekti (Aşağıdan buraya taşıdık)
  useEffect(() => {
      // Eğer okunmamış mesaj sayısı ARTTIYSA (Yeni bildirim geldiyse)
      if (unreadCount > prevUnreadCountRef.current) {
          notificationSound.play().catch(e => console.log("Ses çalma engellendi:", e));
          document.title = `(${unreadCount}) 🔔 Yeni Bildirim! | TaskNetwork`;
      } else if (unreadCount === 0) {
          document.title = "TaskNetwork";
      }
      // Sayacı güncelle
      prevUnreadCountRef.current = unreadCount;
  }, [notifications, notificationSound, unreadCount]);

  // --- 2. VERİ ÇEKME FONKSİYONLARI ---
  
  // A) İş Arkadaşlarını Çek
  const fetchColleagues = useCallback(async () => {
      if(!token) return;
      try {
          const res = await axios.get('http://127.0.0.1:8000/api/users/');
          
          interface BackendUserResponse {
              id: number;
              username: string;
              email?: string;
              rank?: number;
              title?: string;
              department?: string;
              status?: string;
              profile?: {
                  phone?: string;
                  privacy_settings?: { [key: string]: boolean | undefined };
                  notification_settings?: { [key: string]: boolean | undefined };
                  rank?: number;
                  title?: string;
                  department?: string;
              };
              [key: string]: unknown; 
          }

          const serverData: UserData[] = res.data.map((u: BackendUserResponse) => ({
              ...u,
              phone: u.profile?.phone, 
              privacy_settings: u.profile?.privacy_settings,
              notification_settings: u.profile?.notification_settings,
              rank: u.rank || u.profile?.rank,
              title: u.title || u.profile?.title,
              department: u.department || u.profile?.department,
              status: (u.status as unknown) || 'offline'
          }));
          
          setColleagues(prev => {
              const myLocalProfile = prev.find(c => c.username === currentUser);
              const myCurrentStatus = myLocalProfile ? myLocalProfile.status : 'online';
              return serverData.map(serverUser => 
                  serverUser.username === currentUser ? { ...serverUser, status: myCurrentStatus } : serverUser
              );
          });
      } catch (e) { console.error("Kullanıcı hatası", e); }
  }, [currentUser, token]);

  // B) Profil ve İstatistik Çek
  const fetchMyProfileAndStats = useCallback(() => {
    if (!currentUser || !token) return;
    fetchColleagues(); 
    fetch('http://127.0.0.1:8000/api/users/me/', { headers: { 'Authorization': `Token ${token}` } })
        .then(res => res.json())
        .then(data => {
            const profileObj = data.profile || {};
            setBgStyle(profileObj.background_style || 'plain');
        });

    fetch('http://127.0.0.1:8000/api/users/stats/', { headers: { 'Authorization': `Token ${token}` } })
        .then(res => res.json())
  }, [currentUser, token, fetchColleagues]);

  // C) Görevleri Çek (Graph Node'larını Oluştur)
  const fetchTasks = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/tasks/');
      const serverTasks: TaskData[] = response.data;
      
      setAllTasks(serverTasks);

      setNodes((currentNodes) => {
        // Mevcut seçim durumlarını korumak için harita
        const currentSelectionMap = new Map(currentNodes.map(n => [n.id, n.selected]));
        // Konumları korumak için (sürükleme sırasında titreme olmasın diye)
        const currentPosMap = new Map(currentNodes.map(n => [n.id, n.position]));

        const hubNode: Node = {
            id: 'hub-center', 
            type: 'hub',      
            position: { x: 0, y: 0 }, 
            data: { label: 'Center' },
            draggable: false, 
            selectable: false, 
            zIndex: -1 
        };

        const activeTasks = serverTasks.filter(t => {
             if (t.status !== 'active') return false;
             const myAssignment = t.assignments.find(a => a.user.username === currentUser);
             if (myAssignment && (myAssignment.is_completed || myAssignment.is_failed)) return false;
             const posX = t.node_data?.position_x || 0;
             const posY = t.node_data?.position_y || 0;
             if (posX === 0 && posY === 0) return t.created_by.username === currentUser;
             return true;
        });

        const taskNodes: Node[] = activeTasks.map((task) => {
            const nodeId = task.id.toString();
            
            // Backend'den gelen PIN bilgisi (Varsayılan false)
            const isPinned = task.node_data?.is_pinned || false;

            // Eğer ekranda varsa mevcut konumu al, yoksa veritabanından al
            const existingPos = currentPosMap.get(nodeId);
            const finalPosition = existingPos || { 
                x: task.node_data?.position_x || 0, 
                y: task.node_data?.position_y || 0 
            };

            const safeNodeData = task.node_data || { 
                id: 0, 
                position_x: 0, 
                position_y: 0, 
                is_pinned: false 
            };

            return {
                id: nodeId,
                type: 'cyber',
                // --- İŞTE İSTEDİĞİN BASİT KİLİT MANTIĞI ---
                // Pinliyse (true) -> draggable: false (Hareket Edemez)
                // Pinli değilse (false) -> draggable: true (Hareket Eder)
                draggable: !isPinned, 
                // ------------------------------------------
                position: finalPosition, 
                selected: currentSelectionMap.get(nodeId) || false, 
                data: { 
                    fullData: { 
                        ...task, 
                        node_data: { 
                            ...safeNodeData,    
                            is_pinned: isPinned 
                        } 
                    } 
                }, 
                parentNode: 'hub-center', 
            };
        });

        return [hubNode, ...taskNodes];
      });

    } catch (error) { console.error("Görev hatası:", error); }
  }, [setNodes, currentUser, token, setAllTasks]);  

  // D) Bağlantıları Çek
  const fetchDependencies = useCallback(async () => {
    if(!token) return;
    try {
        const res = await axios.get('http://127.0.0.1:8000/api/dependencies/');
        setEdges(res.data.map((dep: DependencyData) => ({
            id: `e${dep.source_task}-${dep.target_task}`,
            source: dep.source_task.toString(), 
            target: dep.target_task.toString(),
            animated: true, // Hareketli
            type: 'smoothstep', // Devre stili
            style: { 
                stroke: '#E91E63', // Neon Pembe
                strokeWidth: 2,
                filter: 'drop-shadow(0 0 3px #E91E63)'
            }
        })));
    } catch (e) { console.error("Bağlantı hatası", e); }
  }, [setEdges, token]);

  // E) Bildirimleri Çek
  const fetchNotifications = useCallback(async () => {
      if(!token) return;
      try {
          const res = await axios.get('http://127.0.0.1:8000/api/notifications/');
          setNotifications(res.data);
      } catch (e) { console.error("Bildirim hatası", e); }
  }, [token]);

  // --- 3. EFFECTS (Yan Etkiler) ---
  
  useEffect(() => {
      if(isAuthenticated && token) {
          const loadInitialData = async () => {
              await fetchTasks();
              await fetchDependencies();
              await fetchColleagues();
              fetchMyProfileAndStats();
          };
          loadInitialData();
          
          const lastSeen = localStorage.getItem(`dashboardLastSeen_${currentUser}`);
          const now = Date.now();
          if (!lastSeen || (now - parseInt(lastSeen) > 1000 * 60 * 60)) {
              setTimeout(() => {
                setShowDashboard(true);
            }, 0);
              localStorage.setItem(`dashboardLastSeen_${currentUser}`, now.toString());
          }
      }
  }, [isAuthenticated, token, currentUser, fetchTasks, fetchDependencies, fetchColleagues, fetchMyProfileAndStats]);

  // --- OTOMATİK GÜNCELLEME DÖNGÜSÜ ---
  // App.tsx içindeki otomatik güncelleme döngüsü
useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => { 
        // 1. KURAL: Eğer kullanıcı bir şey sürüklüyorsa (isDragging) VEYA seçim yapıyorsa (isSelecting)
        // ASLA güncelleme yapma! Yoksa elindeki işlem iptal olur.
        if (isDragging || isSelecting) return; 

        fetchColleagues(); 
        fetchNotifications(); 
        if (token) {
            axios.post('http://127.0.0.1:8000/api/tasks/check_deadlines/').catch(()=>{});
            fetchTasks(); 
        }
    }, 2000); 

    return () => clearInterval(interval);
}, [isAuthenticated, fetchColleagues, fetchNotifications, fetchTasks, token, isDragging, isSelecting]);

  const updateMyStatus = useCallback(async (newStatus: UserStatus) => {
    if(newStatus === 'online' || newStatus === 'busy') setPreferredStatus(newStatus);
    setColleagues(prev => prev.map(c => c.username === currentUser ? {...c, status: newStatus} : c));

    try { 
        await axios.post('http://127.0.0.1:8000/api/users/update_status/', { status: newStatus }); 
    } catch {
        // Sessizce geç
    }
  }, [currentUser]);

  useEffect(() => {
      const handleFocus = () => updateMyStatus(preferredStatus);
      const handleBlur = () => {
          setColleagues(prev => prev.map(c => c.username === currentUser ? {...c, status: 'away'} : c));
          axios.post('http://127.0.0.1:8000/api/users/update_status/', { status: 'away' }).catch(()=>{});
      };
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);
      return () => { window.removeEventListener('focus', handleFocus); window.removeEventListener('blur', handleBlur); };
  }, [preferredStatus, currentUser, updateMyStatus]);

  // --- 4. HELPER HANDLERS ---
  const handleLogout = async () => {
      try { 
          if(token) await fetch('http://127.0.0.1:8000/api/users/update_status/', { 
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` }, body: JSON.stringify({ status: 'offline' }) 
          });
      } catch(e) { console.error(e); }
      localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('auth_token');
      window.location.href = '/'; 
  };

  const openTaskDetail = useCallback((task: TaskData) => {
      setCurrentTaskData(task);
      setSidebarMode('edit');
      setIsSidebarOpen(true);
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(async (_, node) => {
    // EĞER TIKLANAN MERKEZ İSE -> GÖREV AĞINI AÇ
    if (node.type === 'hub') {
        setSidebarMode('network'); // Yeni mod: Network
        setIsSidebarOpen(true);
        return;
    }
    const task = node.data.fullData as TaskData;
    openTaskDetail(task);
    const myAssign = task.assignments.find(a => a.user.username === currentUser);
    if (myAssign && !myAssign.is_read && token) {
        try { 
            await axios.post(`http://127.0.0.1:8000/api/tasks/${task.id}/mark_as_read/`); 
            fetchTasks(); 
        } catch { console.error("Okundu hatası"); }
    }
  }, [fetchTasks, currentUser, openTaskDetail, token]);

  const onNodeDragStart: NodeDragHandler = useCallback(() => {
      setIsDragging(true);
  }, []);

  // --- TOPLU TAŞIMA VE KAYDETME ---
  const onNodeDragStop: NodeDragHandler = useCallback(async (_, node) => {
    // 1. React Flow Motorundan (Instance) CANLI veriyi alıyoruz.
    // Bu veri, sürükleme bittiği andaki EN GÜNCEL koordinatları içerir.
    // State'e (nodes) bakmıyoruz çünkü o render bekleyebilir.
    if (!rfInstance) return;
    const liveNodes = rfInstance.getNodes();

    // 2. Kimleri kaydedeceğiz?
    // Eğer Shift ile seçim yapıldıysa "n.selected" true olanları al.
    const selectedNodes = liveNodes.filter(n => n.selected);

    // Eğer seçim yoksa (sadece tek birini tutup çektiysen), sürüklenen node'u bul ve listeye koy.
    // "node" parametresi eventten gelir, ama biz liveNodes içindeki güncel halini buluyoruz.
    const targetNode = liveNodes.find(n => n.id === node.id);
    const nodesToProcess = selectedNodes.length > 0 ? selectedNodes : (targetNode ? [targetNode] : []);

    console.log(`💾 Kayıt Başladı: ${nodesToProcess.length} adet node'un güncel konumu alınıyor...`);

    try {
        // 3. Hepsini sırayla kaydet
        for (const n of nodesToProcess) {
            const taskId = parseInt(n.id);
            if (isNaN(taskId)) continue;

            // HESAP YOK! DELTA YOK! 
            // rfInstance zaten Hub'a göre (parentNode yüzünden) doğru x/y veriyor.
            // Direkt alıp paketliyoruz.
            const finalX = Math.round(n.position.x);
            const finalY = Math.round(n.position.y);

            console.log(`>> ID:${taskId} -> Konum: X=${finalX}, Y=${finalY}`);

            await axios.post(`http://127.0.0.1:8000/api/tasks/${taskId}/update_position/`, { 
                x: finalX, 
                y: finalY 
            });
        }

        // 4. Yerel hafızayı güncelle (Optimistic Update)
        // Ekran titremesin diye local state'e de aynısını yazıyoruz.
        setAllTasks(prevTasks => prevTasks.map(t => {
            const movedNode = nodesToProcess.find(u => u.id === t.id.toString());
            
            if (movedNode) {
                return {
                    ...t,
                    node_data: {
                        ...(t.node_data || { id: 0, is_pinned: false }), 
                        position_x: Math.round(movedNode.position.x),
                        position_y: Math.round(movedNode.position.y)
                    }
                };
            }
            return t;
        }));

        console.log("✅ Tüm konumlar başarıyla sabitlendi.");

    } catch (e) {
        console.error("Kayıt hatası:", e);
    } finally {
        setIsDragging(false);
    }
  }, [rfInstance, setAllTasks]);

  const onSelectionDragStop = useCallback(async (_: React.MouseEvent, selectionNodes: Node[]) => {
    console.log(`📦 Toplu Taşıma Bitti! ${selectionNodes.length} adet node kaydediliyor...`);

    try {
        // selectionNodes: React Flow bize taşınanların en son halini (güncel konum) veriyor.
        // Hesap kitap yapmaya gerek yok, direkt alıp gönderiyoruz.
        for (const n of selectionNodes) {
            const taskId = parseInt(n.id);
            if (isNaN(taskId)) continue;

            const finalX = Math.round(n.position.x);
            const finalY = Math.round(n.position.y);

            console.log(`>> SEÇİM KAYDI ID:${taskId} -> X:${finalX} Y:${finalY}`);

            await axios.post(`http://127.0.0.1:8000/api/tasks/${taskId}/update_position/`, { 
                x: finalX, 
                y: finalY 
            });
        }

        // Yerel hafızayı güncelle (Optimistic Update)
        setAllTasks(prevTasks => prevTasks.map(t => {
            const movedNode = selectionNodes.find(u => u.id === t.id.toString());
            if (movedNode) {
                return {
                    ...t,
                    node_data: {
                        ...(t.node_data || { id: 0, is_pinned: false }), 
                        position_x: Math.round(movedNode.position.x),
                        position_y: Math.round(movedNode.position.y)
                    }
                };
            }
            return t;
        }));

        console.log("✅ Toplu seçim başarıyla kaydedildi.");

    } catch (e) {
        console.error("Toplu kayıt hatası:", e);
    }
  }, [setAllTasks]);
  
  // --- YENİ BAĞLANTI VE GÖRSEL MANTIK ---
  // 1. Görsel Rehberlik (Kabloyu tutunca diğerlerini sönükleştir)
  useEffect(() => {
    setNodes((nds) => nds.map((node) => {
        // Eğer kablo çekilmiyorsa herkes %100 opak
        if (!connectingNodeId) return { ...node, style: { ...node.style, opacity: 1 } };
        
        const sourceNode = nds.find(n => n.id === connectingNodeId);
        
        // Eğer kaynak veya hedef HUB ise, veya veri eksikse hesaplama yapma, parlak kalsın.
        if (!sourceNode || sourceNode.type === 'hub' || node.type === 'hub' || !sourceNode.data.fullData || !node.data.fullData) {
            return { ...node, style: { ...node.style, opacity: 1 } };
        }

        const sourceDate = sourceNode.data.fullData.due_date ? new Date(sourceNode.data.fullData.due_date).getTime() : 0;
        const targetDate = node.data.fullData.due_date ? new Date(node.data.fullData.due_date).getTime() : 0;

        // Geçmişe bağlanamaz kuralı (Söndür)
        // Eğer kaynakta tarih yoksa (0) kısıtlama yok demektir.
        if (sourceDate !== 0 && targetDate !== 0 && targetDate < sourceDate) {
            return { ...node, style: { ...node.style, opacity: 0.2, transition: 'opacity 0.3s' } };
        }
        
        return { ...node, style: { ...node.style, opacity: 1, transition: 'opacity 0.3s' } };
    }));
  }, [connectingNodeId, setNodes]);

  // 2. Kabloyu Tutma
  const onConnectStart = useCallback((_: unknown, { nodeId }: { nodeId: string | null }) => {
    if (nodeId) setConnectingNodeId(nodeId);
  }, []);

  // 3. Kabloyu Bırakma
  const onConnectEnd = useCallback(() => {
    setConnectingNodeId(null);
  }, []);

  // 4. Bağlama İşlemi (Validasyonlu ve Cyber Stil)
  const onConnect = useCallback(async (params: Connection | Edge) => {
    if (params.source === params.target) return;

    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    // Validasyon (HUB Kontrolü Eklenmiş Hali)
    if (sourceNode && targetNode) {
        // Eğer biri HUB ise tarih kontrolü yapma, direkt bağla
        if(sourceNode.type !== 'hub' && targetNode.type !== 'hub') {
            const sourceDate = sourceNode.data.fullData?.due_date ? new Date(sourceNode.data.fullData.due_date).getTime() : 0;
            const targetDate = targetNode.data.fullData?.due_date ? new Date(targetNode.data.fullData.due_date).getTime() : 0;

            if (sourceDate !== 0 && targetDate !== 0 && targetDate < sourceDate) {
                alert("⚠️ Zaman Paradoxu: Bir iş, kendisinden önce bitmesi gereken bir işe bağlanamaz!");
                return;
            }
        }
    }

    setEdges((eds) => addEdge({
        ...params, 
        animated: true, 
        type: 'smoothstep', // Düz ve keskin hatlar
        style: { 
            stroke: '#00f3ff', // Camgöbeği (Cyan) Neon
            strokeWidth: 2, 
            filter: 'drop-shadow(0 0 4px #00f3ff)' // Parlama efekti
        },
        markerEnd: {
            type: MarkerType.ArrowClosed, // Ok ucu
            color: '#00f3ff',
        },
    }, eds));

    if (params.source && params.target) {
        try { await axios.post('http://127.0.0.1:8000/api/dependencies/', { source_task: params.source, target_task: params.target }); } catch (e) { console.error(e); }
    }
  }, [nodes, setEdges]);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuNodeId(null); 
    setMenu({ x: event.clientX, y: event.clientY });
  }, []);

  // Node'a sağ tıklayınca
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      // HUB Node'a sağ tıklanırsa menü açma (Gerek yok)
      if (node.type === 'hub') return;

      // Hangi node'a tıklandığını kaydet
      setContextMenuNodeId(node.id); 
      // O anki node verisini de aktif yap ki "Sabitle" butonu durumunu bilsin
      setCurrentTaskData(node.data.fullData);

      setMenu({ x: event.clientX, y: event.clientY });
      
      // Hangi node'a tıklandığını anlamak için bir state daha eklemeliyiz:
      // const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
      // setContextMenuNodeId(node.id);
      // Hızlı çözüm için currentTaskData'yı kullanabiliriz:
      setCurrentTaskData(node.data.fullData); 
  }, []);

  // --- NİHAİ VE TEMİZ SABİTLEME FONKSİYONU ---
  const handleTogglePin = async () => {
      if (!currentTaskData || !currentTaskData.node_data) return;
      
      const taskNodeId = currentTaskData.node_data.id; 
      const taskId = currentTaskData.id; 
      // Mevcut durumun tersini al
      const newPinnedState = !currentTaskData.node_data.is_pinned;

      // 1. ANINDA GÖRSEL GÜNCELLEME (Optimistic Update)
      // Kullanıcı basar basmaz kilitlendiğini görsün.
      
      // A) Nodes State'ini Güncelle (Kilit Simgesi ve Draggable)
      setNodes((nds) => nds.map((n) => {
          if (n.id === taskId.toString()) {
              return {
                  ...n,
                  draggable: !newPinnedState, // True ise hareket edemez
                  data: {
                      ...n.data,
                      fullData: {
                          ...n.data.fullData,
                          node_data: {
                              ...n.data.fullData.node_data,
                              is_pinned: newPinnedState
                          }
                      }
                  }
              };
          }
          return n;
      }));

      // B) AllTasks State'ini Güncelle (Veri Tutarlılığı)
      setAllTasks((prev) => prev.map(t => {
          if (t.id === taskId) {
              const existingNodeData = t.node_data || { id: 0, position_x: 0, position_y: 0, is_pinned: false };
              return {
                  ...t,
                  node_data: {
                      ...existingNodeData,
                      is_pinned: newPinnedState
                  }
              };
          }
          return t;
      }));

      setMenu(null); // Menüyü kapat

      // 2. BACKEND'E KAYDET
      try {
          await axios.patch(`http://127.0.0.1:8000/api/nodes/${taskNodeId}/`, {
              is_pinned: newPinnedState
          });
          // Başarılı olursa hiçbir şey yapmamıza gerek yok.
          // Çünkü bir sonraki fetchTasks() artık Backend'den 'is_pinned: true' alacak.
          
      } catch (e) { 
          console.error("Pin hatası", e); 
          alert("İşlem başarısız oldu, eski haline dönülüyor.");
          fetchTasks(); // Hata olursa sunucudaki eski haline dön
      }
  };

  const onPaneClick = useCallback(() => {
    // 1. Menüyü kapat
    setMenu(null);
    
    // 2. Açık olan tüm panelleri kapat (Ergonomi)
    setIsSidebarOpen(false);
    setIsNotifOpen(false);
    setIsInboxOpen(false);
    
    // Seçimi kaldır (Opsiyonel, genelde boşluğa tıklayınca seçim kalkar)
    // rfInstance?.addNodes([{...}]); // Buna gerek yok ReactFlow kendi hallediyor
  }, []);

  const handleAddNodeFromMenu = () => {
    if (menu && rfInstance) {
        // Ekran koordinatını (px), React Flow evren koordinatına (x,y) çevir
        // Bu sayede zoom yapsan bile tam tıkladığın yere gelir.
        const position = rfInstance.screenToFlowPosition({ x: menu.x, y: menu.y });
        // Yeni görev formuna bu pozisyonu gönder
        setNewTaskPos(position); 
        setSidebarMode('create');
        setIsSidebarOpen(true);
        setMenu(null);
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const taskIdStr = event.dataTransfer.getData('application/reactflow');
      if (!taskIdStr || !rfInstance) return;

      const taskId = parseInt(taskIdStr);
      
      // 1. DOĞRU HESAPLAMA (screenToFlowPosition)
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 2. EKRANI GÜNCELLE (Local State - Burası position_x/y kullanır)
      setAllTasks(prev => prev.map(t => {
          if (t.id !== taskId) return t;
          return {
              ...t,
              node_data: {
                  ...(t.node_data || { id: 0, is_pinned: false }),
                  position_x: position.x,
                  position_y: position.y
              }
          };
      }));

      // 3. BACKEND'E GÖNDER
      try {
          // Backend 'views.py' içinde request.data.get('x') ve get('y') ile karşılıyor.
          // O yüzden buraya 'x' ve 'y' olarak göndermeliyiz.
          await axios.post(`http://127.0.0.1:8000/api/tasks/${taskId}/update_position/`, {
              x: position.x,
              y: position.y  // <-- DİKKAT: 'position_y' değil 'y' olmalı!
          });
          
          // fetchTasks(); // Gerekirse açabilirsin ama Optimistic Update zaten hallediyor.
      } catch (e) { console.error("Konum güncellenemedi", e); }
    },
    [rfInstance, setAllTasks]
  );

  const myProfile = colleagues.find(c => c.username === currentUser);

  // --- YENİ: SESLİ VE GÖRSEL UYARI SİSTEMİ ---
  useEffect(() => {
      const unreadCount = notifications.filter(n => !n.is_read).length;
      
      // Eğer okunmamış mesaj sayısı ARTTIYSA (Yeni bildirim geldiyse)
      if (unreadCount > prevUnreadCountRef.current) {
          // 1. SES ÇAL (Kullanıcı sayfayla etkileşime girmiş olmalı)
          notificationSound.play().catch(e => console.log("Ses çalma engellendi (Tarayıcı politikası):", e));
          
          // 2. SEKME BAŞLIĞINI DEĞİŞTİR (Dikkat Çekme)
          document.title = `(${unreadCount}) 🔔 Yeni Bildirim! | TaskNetwork`;
      } else if (unreadCount === 0) {
          // Okunduysa başlığı normale döndür
          document.title = "TaskNetwork";
      }

      // Sayacı güncelle
      prevUnreadCountRef.current = unreadCount;
  }, [notifications, notificationSound]);

  const roundButtonStyle = { width: 40, height: 40, borderRadius: '50%', background: '#333', border: '1px solid #555', color: 'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'0.2s' };

  // --- 5. RENDER ---
  if (!isAuthenticated) return <LoginScreen onLoginSuccess={(user) => { 
      setIsAuthenticated(true); setCurrentUser(user); localStorage.setItem('username', user); 
      setToken(localStorage.getItem('auth_token'));
  }} />;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', overflow: 'hidden' }}>
      
      {/* GRAPH CANVAS */}
      <ReactFlow
        proOptions={{ hideAttribution: true }} 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes} 
        onNodesChange={onNodesChange} 
        onEdgesChange={onEdgesChange} 
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd} 
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStop={onSelectionDragStop}
        onNodeDragStart={onNodeDragStart} 
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}            
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onInit={setRfInstance}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionStart={() => setIsSelecting(true)} // Seçim kutusu açıldı -> Fetch DUR
        onSelectionEnd={() => setIsSelecting(false)}  // Seçim bitti -> Fetch DEVAM     
        selectionKeyCode="Shift"
        selectionMode={SelectionMode.Partial}           
        fitView
      >
        
        {/* --- SAĞ TIK MENÜSÜ (ContextMenu) --- */}
        {menu && (
            <div 
                style={{
                    position: 'absolute',
                    top: menu.y,
                    left: menu.x,
                    zIndex: 1000,
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '5px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', gap: 5,
                    minWidth: 150
                }}
            >
                {/* 1. EĞER BİR NODE'A TIKLANDIYSA -> SABİTLE GÖSTER */}
                {contextMenuNodeId ? (
                    currentTaskData && (
                        <button 
                            onClick={handleTogglePin} 
                            style={{ 
                                background: 'transparent', border: 'none', 
                                color: currentTaskData.node_data?.is_pinned ? '#FFD700' : '#ddd',
                                textAlign: 'left', padding: '8px 12px', cursor: 'pointer', 
                                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 4
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            {currentTaskData.node_data?.is_pinned ? <Unlock size={14}/> : <Lock size={14}/>}
                            {currentTaskData.node_data?.is_pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                        </button>
                    )
                ) : (
                /* 2. EĞER BOŞLUĞA TIKLANDIYSA -> EKLE GÖSTER */
                    <button 
                        onClick={handleAddNodeFromMenu}
                        style={{
                            background: 'transparent', border: 'none', color: 'white', 
                            textAlign: 'left', padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: 8, borderRadius: 4
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Plus size={14} color="#4CAF50"/> Buraya Görev Ekle
                    </button>
                )}
            </div>
        )}

        {/* --- DİNAMİK ARKA PLAN --- */}
        <Background 
            variant={bgStyle === 'grid' ? BackgroundVariant.Lines : BackgroundVariant.Dots}
            gap={bgStyle === 'grid' ? 40 : 20}
            size={bgStyle === 'plain' ? 0 : 1}
            color={bgStyle === 'grid' ? '#333' : '#444'} 
            style={{
                backgroundColor: bgStyle === 'plain' ? '#111' : 'transparent'
            }}
        />
      </ReactFlow>

      {/* DASHBOARD OVERLAY */}
      <Dashboard isVisible={showDashboard} onClose={() => setShowDashboard(false)} currentUser={currentUser} myProfile={myProfile} allTasks={allTasks} />

      {/* TOP LEFT MENU */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 5, display: 'flex', gap: '15px', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white', marginRight: 10 }}>TaskNetwork</h2>
        <button onClick={() => { rfInstance?.setCenter(30, 30, { zoom: 1, duration: 800 }); }} title="Merkeze Dön" style={{...roundButtonStyle, background: '#333'}}><Home size={20} /></button> 
        <button onClick={() => { setSidebarMode('create'); setIsSidebarOpen(true); setNewTaskPos(null); setMenu(null); }} title="Yeni Görev" style={{...roundButtonStyle, background: sidebarMode === 'create' && isSidebarOpen ? '#4CAF50' : '#333'}}><Plus size={20} /></button>
        {/* DENEY İÇİN LİSTE MODU KAPATILDI
        <button onClick={() => { setSidebarMode('list'); setIsSidebarOpen(true); setMenu(null); }} title="Liste" style={{...roundButtonStyle, background: sidebarMode === 'list' && isSidebarOpen ? '#ff9800' : '#333'}}><List size={20} /></button>
        */}
        <button onClick={() => { setSidebarMode('team'); setIsSidebarOpen(true); setMenu(null); }} title="Ekip" style={{...roundButtonStyle, background: sidebarMode === 'team' && isSidebarOpen ? '#2196F3' : '#333'}}><Users size={20} /></button>
      </div>

      {/* TOP RIGHT: NOTIFICATIONS */}
      <div style={{ position: 'absolute', top: 20, right: isSidebarOpen ? 465 : 20, transition: 'right 0.3s ease', zIndex: 20 }}>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} style={{...roundButtonStyle, position:'relative'}}>
              <Bell size={20} />
              {unreadCount > 0 && <div style={{position:'absolute', top:-5, right:-5, background:'white', color:'black', border:'2px solid black', width:20, height:20, borderRadius:'50%', fontSize:'0.7rem', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center'}}>{unreadCount}</div>}
          </button>
          
          <NotificationPanel 
            isOpen={isNotifOpen} 
            notifications={notifications} 
            onClear={async (e) => {
                e.stopPropagation();
                try { await fetch('http://127.0.0.1:8000/api/notifications/clear_all/', { method: 'DELETE', headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' }}); setNotifications([]); } catch(err){console.error(err);}
            }}
            onMarkAllRead={async () => {
                try { await axios.post('http://127.0.0.1:8000/api/notifications/mark_all_read/'); setNotifications(prev => prev.map(n => ({...n, is_read: true}))); } catch {
                    console.error("Tümü okundu yapılamadı"); 
                }
            }}
            onItemClick={async (notif) => {
                if(!notif.is_read) { await axios.post(`http://127.0.0.1:8000/api/notifications/${notif.id}/mark_read/`); setNotifications(prev => prev.map(n => n.id===notif.id ? {...n, is_read:true}:n)); }
                if(notif.task) { const taskRes = await axios.get(`http://127.0.0.1:8000/api/tasks/${notif.task}/`); openTaskDetail(taskRes.data); setIsNotifOpen(false); }
            }}
          />
      </div>

      {/* SIDEBAR CONTAINER */}
        <div style={{ 
            position: 'absolute', top: 0, 
            // SAĞDAN GELİŞ ANİMASYONU:
            // Eğer açık ise right: 0, kapalı ise right: -450px (Ekran dışına itiyoruz)
            right: isSidebarOpen ? 0 : '-450px', 
            width: '400px', height: '100%', 
            background: '#1e1e1e', borderLeft: '1px solid #333', zIndex: 10, padding: '25px', 
            display: 'flex', flexDirection: 'column', gap: '15px', color: 'white', 
            boxShadow: '-10px 0 30px rgba(0,0,0,0.8)', overflowY: 'auto', paddingBottom: '80px',
            
            // --- GEÇİŞ EFEKTİ ---
            transition: 'right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', // Yumuşak kayma
            // --------------------
        }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom:'1px solid #333', paddingBottom: 15}}>
                <h3 style={{margin:0}}>
                    {sidebarMode === 'create' ? 'Yeni Görev' : sidebarMode === 'edit' ? 'Görev Detayı' : sidebarMode === 'team' ? 'Ekip Ağı' : sidebarMode === 'settings' ? 'Ayarlar' : 'Görev Listesi'}
                </h3>
                <button onClick={() => setIsSidebarOpen(false)} style={{background:'none', border:'none', color:'#888', cursor:'pointer'}}><X size={24} /></button>
            </div>

            {/* CONTENT SWITCHER */}
            {sidebarMode === 'team' && <TeamPanel currentUser={currentUser} colleagues={colleagues} onLogout={handleLogout} preferredStatus={preferredStatus} onUpdateStatus={updateMyStatus} />}
            {/* DENEY İÇİN LİSTE MODU KAPATILDI
            {sidebarMode === 'list' && <TaskListPanel currentUser={currentUser} allTasks={allTasks} onTaskClick={openTaskDetail} />}
            */}
            {sidebarMode === 'create' && <CreateTaskForm colleagues={colleagues} token={token} onTaskCreated={() => { fetchTasks(); setNewTaskPos(null);}} initialPosition={newTaskPos} />}
            {sidebarMode === 'edit' && currentTaskData && <TaskDetailPanel task={currentTaskData} currentUser={currentUser} token={token} onUpdate={fetchTasks} onClose={() => setIsSidebarOpen(false)} />}
            {sidebarMode === 'network' && (
              <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  gap: '15px',
                  overflow: 'hidden'
              }}>
                    {/* BAŞLIK VE İSTATİSTİK */}
                    <div style={{
                        padding: '15px',
                        background: 'linear-gradient(135deg, #1e1e1e 0%, #252525 100%)',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', 
                            background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(0, 243, 255, 0.3)'
                        }}>
                            <Home size={20} className="spin-slow" /> {/* Dönen ikon */}
                        </div>
                        <div>
                            <div style={{fontSize: '1rem', fontWeight: 'bold', color: 'white'}}>Görev İstasyonu</div>
                            <div style={{fontSize: '0.75rem', color: '#888'}}>
                                Aktif Görev Sayısı: <span style={{color: '#00f3ff'}}>
                                 {allTasks.filter(t => {
                                    const isActive = t.status === 'active';
                                    const isInSpace = t.node_data?.position_x !== 0 || t.node_data?.position_y !== 0;
                                    const myAssign = t.assignments.find(a => a.user.username === currentUser);
                                    // Başarısız veya bitmişse sayma
                                    if (myAssign && (myAssign.is_failed || myAssign.is_completed)) return false;
                                    
                                    return isActive && isInSpace;
                                }).length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* LİSTE KAPSAYICISI (TaskSection Tasarımı) */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            
                            {/* Sadece AKTİF, UZAYDA OLAN ve BAŞARISIZ OLMAYANLARI listele */}
                            {allTasks
                                .filter(t => {
                                    // 1. Genel Kurallar: Aktif mi? Uzayda mı?
                                    const isActive = t.status === 'active';
                                    const isInSpace = t.node_data?.position_x !== 0 || t.node_data?.position_y !== 0;
                                    
                                    if (!isActive || !isInSpace) return false;

                                    // 2. Kişisel Durum Kontrolü (YENİ)
                                    // Eğer benim görevim 'failed' (süresi dolmuş) veya 'completed' ise listede görmeyeyim.
                                    const myAssign = t.assignments.find(a => a.user.username === currentUser);
                                    if (myAssign && (myAssign.is_failed || myAssign.is_completed)) return false;

                                    return true;
                                })
                                .map(task => {
                                    // Öncelik Rengi
                                    const pColor = task.priority === 'urgent' ? '#ff4444' : task.priority === 'normal' ? '#2196F3' : '#4CAF50';
                                    
                                    return (
                                        <div 
                                            key={task.id}
                                            onClick={() => {
                                                const x = task.node_data?.position_x || 0;
                                                const y = task.node_data?.position_y || 0;
                                                
                                                // --- BURASI DEĞİŞTİ ---
                                                // Node'un sol üstünü değil, tam ortasını (Center) hesaplıyoruz.
                                                // CyberNode genişliği 240px -> Yarısı 120
                                                // CyberNode yüksekliği ~160px -> Yarısı 80
                                                const centerX = x + 120;
                                                const centerY = y + 80;

                                                rfInstance?.setCenter(centerX, centerY, { zoom: 1.2, duration: 1000 });
                                            }}
                                            style={{
                                                background: '#252525',
                                                borderLeft: `4px solid ${pColor}`, // Sol taraf renkli çizgi
                                                borderTop: '1px solid #333',
                                                borderRight: '1px solid #333',
                                                borderBottom: '1px solid #333',
                                                borderRadius: '6px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                position: 'relative',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateX(5px)';
                                                e.currentTarget.style.background = '#2a2a2a';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateX(0)';
                                                e.currentTarget.style.background = '#252525';
                                            }}
                                        >
                                            <div style={{display:'flex', flexDirection:'column', gap: 4}}>
                                                <span style={{fontWeight:'bold', fontSize:'0.9rem', color: '#eee'}}>
                                                    {task.title}
                                                </span>
                                                <div style={{display:'flex', gap: 8, fontSize: '0.7rem', color: '#aaa'}}>
                                                    <span style={{display:'flex', alignItems:'center', gap:3}}>
                                                        <Users size={10}/> {task.assignments.length}
                                                    </span>
                                                    {task.node_data?.is_pinned && (
                                                        <span style={{color: '#FFD700', display:'flex', alignItems:'center', gap:3}}>
                                                            <Lock size={10}/> Sabit
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '50%',
                                                width: 24, height: 24,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: pColor
                                            }}>
                                                ➜
                                            </div>
                                        </div>
                                    );
                                })}

                            {allTasks.filter(t => t.status === 'active' && (t.node_data?.position_x !== 0)).length === 0 && (
                                <div style={{textAlign: 'center', padding: 20, color: '#666', fontStyle: 'italic'}}>
                                    Uzay boşluğunda aktif görev yok.
                                </div>
                            )}
                       </div>
                   </div>
              </div>
          )}
        </div>

      {/* --- SOL ALT ÇEKMECE (INBOX) --- */}
      {(() => {
          // Sadece 0,0 koordinatında olan (henüz yerleşmemiş) ve bana atanan görevler
          const inboxTasks = allTasks.filter(t => 
              // 1. Henüz yerleşmemiş (Inbox'ta bekleyen)
              t.node_data?.position_x === 0 && 
              t.node_data?.position_y === 0 && 
              
              // 2. Görev aktif olmalı (Tamamlanmış veya Süresi Geçmiş DEĞİL)
              t.status !== 'completed' && 
              t.status !== 'failed' && // <-- YENİ: Süresi geçmişleri gizle

              // 3. BEN OLUŞTURMADIM (Başkası atadı)
              t.created_by.username !== currentUser // <-- YENİ: Kendi oluşturduklarımı gizle
          );

          return (
            <>
                {/* 1. KULP (BUTTON) */}
                <div 
                    onClick={() => setIsInboxOpen(!isInboxOpen)}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 20,
                        width: '400px', // Sağ sidebar ile aynı genişlik
                        height: '40px',
                        background: '#1e1e1e',
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        border: '1px solid #333',
                        borderBottom: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 20px',
                        cursor: 'pointer',
                        zIndex: 40,
                        color: '#ddd',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        boxShadow: '0 -5px 20px rgba(0,0,0,0.5)'
                    }}
                >
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <span>📥 Gelen Kutusu</span>
                        {inboxTasks.length > 0 && (
                            <span style={{background: '#E91E63', color:'white', fontSize:'0.7rem', padding:'2px 8px', borderRadius:10}}>
                                {inboxTasks.length}
                            </span>
                        )}
                    </div>
                    <span>{isInboxOpen ? '▼' : '▲'}</span>
                </div>

                {/* 2. ÇEKMECE (PANEL) */}
                <div style={{
                    position: 'absolute',
                    bottom: 40, // Kulpun hemen üstü
                    left: 20,
                    width: '400px',
                    height: isInboxOpen ? '50vh' : '0px', 
                    transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: '#1e1e1e',
                    borderLeft: '1px solid #333',
                    borderRight: '1px solid #333',
                    borderTop: isInboxOpen ? '1px solid #333' : 'none',
                    overflow: 'hidden', // Kapalıyken içerik taşmasın
                    zIndex: 39,
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{padding: 15, overflowY: 'auto', flex: 1, display:'flex', flexDirection:'column', gap:10}}>
                        {inboxTasks.length === 0 ? (
                            <div style={{color:'#666', textAlign:'center', marginTop:20, fontSize:'0.9rem'}}>
                                Yeni görev yok. Uzay temiz! 🚀
                            </div>
                        ) : (
                            inboxTasks.map(task => (
                                <div 
                                    key={task.id}
                                    draggable // SÜRÜKLENEBİLİR YAPTIK
                                    onDragStart={(event) => {
                                        // Sürüklemeye başlarken ID'yi paketle
                                        event.dataTransfer.setData('application/reactflow', task.id.toString());
                                        event.dataTransfer.effectAllowed = 'move';
                                    }}
                                    style={{
                                        background: '#252525',
                                        padding: 15,
                                        borderRadius: 6,
                                        border: '1px solid #333',
                                        cursor: 'grab',
                                        display: 'flex', flexDirection:'column', gap:5
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#555'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                                >
                                    <div style={{fontWeight:'bold', color:'white', fontSize:'0.9rem'}}>{task.title}</div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#aaa'}}>
                                        <span>{task.priority === 'urgent' ? '🔴 Acil' : '⚪ Normal'}</span>
                                        <span style={{color: '#E91E63'}}>Uzaya Sürükle ↝</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </>
          );
      })()}

    </div>
  );
}