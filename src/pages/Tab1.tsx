import { useState } from "react";
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
} from "@ionic/react";
import "./Tab1.css";
import { camera } from "ionicons/icons";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";

interface ITask {
  text: string;
  image: UserPhoto;
}

interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

const PHOTO_STORAGE = "photos";

const DEFAULT_VALUES = {
  text: "",
  image: {
    filepath: "",
    webviewPath: "",
  },
};

const Tab1: React.FC = () => {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [newTask, setNewTask] = useState<ITask>(DEFAULT_VALUES);
  const [isOpen, setIsOpen] = useState(false);

  const addTask = () => {
    if (newTask.text.trim()) {
      setTasks([...tasks, newTask]);
      setNewTask(DEFAULT_VALUES);
      setIsOpen(false);
    }
  };

  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const fileName = Date.now() + ".jpeg";
    const savedFileImage = await savePicture(photo, fileName);
    setNewTask({ ...newTask, image: savedFileImage });
    Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(savedFileImage) });
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

        <IonList>
          {tasks.map((task: ITask, i: number) => (
            <IonItem key={i}>
              <div>
                <h3>{task.text}</h3>
                {task.image.webviewPath && (
                  <img 
                    src={task.image.webviewPath} 
                    alt="Task"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                )}
              </div>
            </IonItem>
          ))}
        </IonList>

        <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
          <IonContent className="ion-padding">
            <IonInput
              value={newTask.text}
              placeholder="Enter task"
              onIonChange={(e) =>
                setNewTask({ ...newTask, text: e.detail.value! })
              }
            />
            <IonFab vertical="bottom" horizontal="center" slot="fixed">
              <IonFabButton onClick={() => takePhoto()}>
                <IonIcon icon={camera}></IonIcon>
              </IonFabButton>
            </IonFab>
            <IonButton expand="full" onClick={addTask}>
              Save
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
