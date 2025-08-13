import { useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import "./Tab1.css";

const Tab1: React.FC = () => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask]);
      setNewTask("");
      setIsOpen(false);
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
          {tasks.map((task: any, i: number) => (
            <IonItem key={i}>{task}</IonItem>
          ))}
        </IonList>

        <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
          <IonContent className="ion-padding">
            <IonInput
              value={newTask}
              placeholder="Enter task"
              onIonChange={(e) => setNewTask(e.detail.value!)}
            />
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
