import { useState, useEffect } from "react";
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  isPlatform,
  IonAlert,
  IonLabel,
} from "@ionic/react";
import "./Tab1.css";
import { camera, trash } from "ionicons/icons";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { databaseService, ITask } from "../services/databaseService";

interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

const DEFAULT_VALUES = {
  text: "",
  image_filepath: "",
  image_webview_path: "",
  completed: false,
};

const Tab1: React.FC = () => {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [newTask, setNewTask] = useState<ITask>(DEFAULT_VALUES);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [deleteAlert, setDeleteAlert] = useState<{
    isOpen: boolean;
    taskId?: number;
  }>({ isOpen: false });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      await databaseService.initializeDatabase();
      await loadTasks();
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const allTasks = await databaseService.getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const addTask = async () => {
    if (newTask.text.trim()) {
      try {
        const taskToAdd = {
          text: newTask.text,
          image_filepath: newTask.image_filepath,
          image_webview_path: newTask.image_webview_path,
          completed: false
        };
        
        await databaseService.addTask(taskToAdd);
        
        setNewTask(DEFAULT_VALUES);
        setIsOpen(false);
        await loadTasks();
      } catch (error) {
        console.error('Error adding task:', error);
      }
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await databaseService.deleteTask(taskId);
      await loadTasks();
      setDeleteAlert({ isOpen: false });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const toggleTaskCompletion = async (taskId: number) => {
    try {
      await databaseService.toggleTaskCompletion(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const getFilteredTasks = () => {
    switch (filterSegment) {
      case 'active':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks;
    }
  };

  const takePhoto = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { camera: cameraPermission } = await Camera.checkPermissions();
        if (cameraPermission === 'denied') {
          const permission = await Camera.requestPermissions();
          if (permission.camera === 'denied') {
            throw new Error('Camera permission denied');
          }
        }
      }
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 100,
        allowEditing: false,
        saveToGallery: false,
      });

      const fileName = Date.now() + ".jpeg";
      const savedFileImage = await savePicture(photo, fileName);
      
      setNewTask({ 
        ...newTask, 
        image_filepath: savedFileImage.filepath,
        image_webview_path: savedFileImage.webviewPath 
      });
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      alert(`Camera error: ${errorMessage || 'Unable to access camera'}`);
    }
  };

  async function base64FromPath(path: string): Promise<string> {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject("method did not return a string");
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  const savePicture = async (
    photo: Photo,
    fileName: string
  ): Promise<UserPhoto> => {
    let base64Data: string | Blob;
    // "hybrid" will detect Cordova or Capacitor;
    if (isPlatform("hybrid")) {
      const file = await Filesystem.readFile({
        path: photo.path!,
      });
      base64Data = file.data;
    } else {
      base64Data = await base64FromPath(photo.webPath!);
    }
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    if (isPlatform("hybrid")) {
      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      const result = {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
      return result;
    } else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      const result = {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
      return result;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Tasks</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonButton onClick={() => setIsOpen(true)}>Add Task</IonButton>

        <IonSegment 
          value={filterSegment} 
          onIonChange={e => setFilterSegment(e.detail.value as string)}
          style={{ marginTop: '10px', marginBottom: '10px' }}
        >
          <IonSegmentButton value="all">
            <IonLabel>All</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="active">
            <IonLabel>Active</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="completed">
            <IonLabel>Completed</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {isLoading ? (
          <div>Loading tasks...</div>
        ) : (
          <IonList>
            {getFilteredTasks().map((task: ITask) => (
              <IonItem key={task.id}>
                <IonCheckbox
                  checked={task.completed}
                  onIonChange={() => task.id && toggleTaskCompletion(task.id)}
                  slot="start"
                />
                <div style={{ width: '100%', marginLeft: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ 
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.6 : 1,
                      color: task.completed ? '#888' : 'inherit'
                    }}>
                      {task.text}
                    </h3>
                    <IonButton 
                      fill="clear" 
                      size="small" 
                      color="danger"
                      onClick={() => setDeleteAlert({ isOpen: true, taskId: task.id })}
                    >
                      <IonIcon icon={trash} />
                    </IonButton>
                  </div>
                  {task.image_webview_path && (
                    <img 
                      src={task.image_webview_path} 
                      alt="Task"
                      style={{ 
                        width: '100px', 
                        height: '100px', 
                        objectFit: 'cover', 
                        marginTop: '10px',
                        opacity: task.completed ? 0.6 : 1
                      }}
                    />
                  )}
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonAlert
          isOpen={deleteAlert.isOpen}
          onDidDismiss={() => setDeleteAlert({ isOpen: false })}
          header="Delete Task"
          message="Are you sure you want to delete this task?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setDeleteAlert({ isOpen: false })
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                if (deleteAlert.taskId) {
                  deleteTask(deleteAlert.taskId);
                }
              }
            }
          ]}
        />

        <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
          <IonContent className="ion-padding">
            <h2>Add New Task</h2>
            <IonInput
              value={newTask.text}
              placeholder="Enter task description"
              onIonChange={(e) =>
                setNewTask({ ...newTask, text: e.detail.value! })
              }
            />
            
            {newTask.image_webview_path && (
              <div style={{ margin: '20px 0' }}>
                <img 
                  src={newTask.image_webview_path} 
                  alt="Preview"
                  style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                />
              </div>
            )}

            <IonFab vertical="bottom" horizontal="center" slot="fixed">
              <IonFabButton onClick={() => takePhoto()}>
                <IonIcon icon={camera}></IonIcon>
              </IonFabButton>
            </IonFab>
            
            <IonButton 
              expand="full" 
              onClick={addTask}
              style={{ marginTop: '20px' }}
            >
              Save Task
            </IonButton>
            
            <IonButton 
              expand="full" 
              fill="clear" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
