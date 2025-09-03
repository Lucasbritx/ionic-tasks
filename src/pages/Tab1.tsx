import { useState, useEffect } from "react";
import {
  IonButton,
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
  IonTitle,
  IonToolbar,
  isPlatform,
  IonAlert,
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
};

const Tab1: React.FC = () => {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [newTask, setNewTask] = useState<ITask>(DEFAULT_VALUES);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
        // Create task object with current values
        const taskToAdd = {
          text: newTask.text,
          image_filepath: newTask.image_filepath,
          image_webview_path: newTask.image_webview_path
        };
        
        await databaseService.addTask(taskToAdd);
        
        setNewTask(DEFAULT_VALUES);
        setIsOpen(false);
        await loadTasks(); // Reload tasks from database
      } catch (error) {
        console.error('Error adding task:', error);
      }
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await databaseService.deleteTask(taskId);
      await loadTasks(); // Reload tasks from database
      setDeleteAlert({ isOpen: false });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 100,
      });

      const fileName = Date.now() + ".jpeg";
      const savedFileImage = await savePicture(photo, fileName);
      
      setNewTask({ 
        ...newTask, 
        image_filepath: savedFileImage.filepath,
        image_webview_path: savedFileImage.webviewPath 
      });
    } catch (error) {
      console.error('Error taking photo:', error);
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
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
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

        {isLoading ? (
          <div>Loading tasks...</div>
        ) : (
          <IonList>
            {tasks.map((task: ITask) => (
              <IonItem key={task.id}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{task.text}</h3>
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
                      style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '10px' }}
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
