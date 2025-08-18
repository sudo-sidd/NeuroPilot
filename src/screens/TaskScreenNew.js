import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
import { useTheme } from '../constants/theme';
import { 
  getTodaysTasks,
  getUnscheduledTasks,
  getCompletedTasks,
  startTask,
  pauseTask,
  completeTask,
  updateTaskSchedule,
  deleteTask,
  createTask,
  updateTask,
  getActionClasses
} from '../services/Database';
import FAB from '../components/ui/FAB';
import Input from '../components/ui/Input';
import PrimaryButton from '../components/ui/PrimaryButton';
import { DeviceEventEmitter } from 'react-native';

const { width } = Dimensions.get('window');

const TaskScreen = ({ navigation }) => {
  const theme = useTheme();
  const { palette, spacing, typography } = theme;
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState('unscheduled'); // 'unscheduled' | 'completed'
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showFinishedToday, setShowFinishedToday] = useState(false);
  const [actionClasses, setActionClasses] = useState([]);

  // Task creation form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState(3);
  const [newTaskActionClass, setNewTaskActionClass] = useState(null);
  const [newTaskStartDate, setNewTaskStartDate] = useState(null);
  const [newTaskDueDate, setNewTaskDueDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [today, unscheduled, completed, classes] = await Promise.all([
        getTodaysTasks(),
        getUnscheduledTasks(),
        getCompletedTasks(20),
        getActionClasses()
      ]);
      
      setTodaysTasks(today);
      setUnscheduledTasks(unscheduled);
      setCompletedTasks(completed);
      setActionClasses(classes);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    const refreshListener = DeviceEventEmitter.addListener('tasksUpdated', loadData);
    return () => refreshListener?.remove();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStartTask = async (task) => {
    try {
      await startTask(task.task_id);
      loadData();
      DeviceEventEmitter.emit('tasksUpdated');
    } catch (error) {
      if (error.message.includes('Maximum 2 ongoing tasks')) {
        Alert.alert(
          'Too Many Ongoing Tasks',
          'You can only have 2 tasks running at once. Pause one to start this task.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handlePauseTask = async (task) => {
    try {
      await pauseTask(task.task_id);
      loadData();
      DeviceEventEmitter.emit('tasksUpdated');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCompleteTask = async (task) => {
    try {
      await completeTask(task.task_id);
      loadData();
      DeviceEventEmitter.emit('tasksUpdated');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteTask = async (task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.task_id);
              setShowTaskDetail(false);
              loadData();
              DeviceEventEmitter.emit('tasksUpdated');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      const taskData = {
        name: newTaskTitle.trim(),
        description: newTaskDescription,
        priority: newTaskPriority,
        actionClassId: newTaskActionClass,
        startDate: newTaskStartDate || new Date().toISOString().slice(0, 10), // Use selected date or default to today
      };

      // Add due date if provided
      if (newTaskDueDate) {
        taskData.dueDate = newTaskDueDate;
      }

      await createTask(taskData);
      
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority(3);
      setNewTaskActionClass(null);
      setNewTaskStartDate(null);
      setNewTaskDueDate(null);
      setShowCreateTask(false);
      loadData();
      DeviceEventEmitter.emit('tasksUpdated');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const formatDate = () => {
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}`;
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 1: return { emoji: '🔴', text: 'High' };
      case 2: return { emoji: '🟡', text: 'Medium' };
      case 3: return { emoji: '⚪', text: 'Low' };
      case 4: return { emoji: '🔵', text: 'Later' };
      default: return { emoji: '⚪', text: 'Low' };
    }
  };

  const getTaskStatusButton = (task) => {
    if (task.status === 'done' || task.completed) {
      return { icon: '✓', color: palette.textLight, disabled: true };
    }
    
    if (task.status === 'in_progress' || task.status === 'ongoing') {
      return { icon: '⏸', color: palette.warning, action: () => handlePauseTask(task) };
    }
    
    return { icon: '▶', color: palette.primary, action: () => handleStartTask(task) };
  };

  const TaskCard = ({ task, section }) => {
    const statusButton = getTaskStatusButton(task);
    const priority = getPriorityBadge(task.priority);
    const isOngoing = task.status === 'in_progress' || task.status === 'ongoing';
    const isCompleted = task.status === 'done' || task.completed;

    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            elevation: isOngoing ? 4 : 2,
            opacity: isCompleted ? 0.7 : 1,
          }
        ]}
        onPress={() => {
          setSelectedTask(task);
          setShowTaskDetail(true);
        }}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View 
          style={[
            styles.taskAccent,
            { backgroundColor: task.action_class_color || palette.primary }
          ]} 
        />
        
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text 
              style={[
                styles.taskTitle,
                { 
                  color: palette.text,
                  textDecorationLine: isCompleted ? 'line-through' : 'none'
                }
              ]}
              numberOfLines={1}
            >
              {task.name}
            </Text>
            
            <View style={styles.taskMeta}>
              <Text style={[styles.priorityBadge, { color: palette.textLight }]}>
                {priority.emoji}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  { 
                    backgroundColor: statusButton.color + '20',
                    borderColor: statusButton.color 
                  }
                ]}
                onPress={statusButton.action}
                disabled={statusButton.disabled}
              >
                <Text style={[styles.statusIcon, { color: statusButton.color }]}>
                  {statusButton.icon}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {task.description && (
            <Text 
              style={[styles.taskDescription, { color: palette.textLight }]}
              numberOfLines={1}
            >
              {task.description}
            </Text>
          )}
          
          {isOngoing && task.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: palette.success + '20' }]}
              onPress={() => handleCompleteTask(task)}
            >
              <Text style={[styles.completeText, { color: palette.success }]}>
                ✓ Mark Complete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getSectionTasks = () => {
    const ongoing = todaysTasks.filter(t => t.status === 'in_progress' || t.status === 'ongoing');
    const assigned = todaysTasks.filter(t => t.status === 'todo' && !t.completed);
    const finished = todaysTasks.filter(t => t.status === 'done' || t.completed);

    return { ongoing, assigned, finished };
  };

  const { ongoing, assigned, finished } = getSectionTasks();
  const hasNoTasks = todaysTasks.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...typography.h1, color: palette.text }}>Tasks</Text>
        <TouchableOpacity
          onPress={() => setShowDrawer(true)}
          style={styles.drawerButton}
        >
          <Text style={[styles.drawerIcon, { color: palette.text }]}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {hasNoTasks ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Text style={[styles.emptyEmoji, { color: palette.textLight }]}>📋</Text>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              No tasks scheduled today
            </Text>
            <Text style={[styles.emptySubtitle, { color: palette.textLight }]}>
              Start your day by adding some tasks
            </Text>
            
            <View style={styles.emptyActions}>
              {unscheduledTasks.length > 0 && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
                  onPress={() => {
                    setDrawerTab('unscheduled');
                    setShowDrawer(true);
                  }}
                >
                  <Text style={[styles.emptyButtonText, { color: palette.text }]}>
                    Auto-Suggest ({unscheduledTasks.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Ongoing Tasks */}
            {ongoing.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Ongoing ({ongoing.length}/2)
                  </Text>
                </View>
                {ongoing.map(task => (
                  <TaskCard key={task.task_id} task={task} section="ongoing" />
                ))}
              </View>
            )}

            {/* Assigned for Today */}
            {assigned.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Assigned for Today ({assigned.length})
                  </Text>
                </View>
                {assigned.map(task => (
                  <TaskCard key={task.task_id} task={task} section="assigned" />
                ))}
              </View>
            )}

            {/* Finished Today */}
            {finished.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowFinishedToday(!showFinishedToday)}
                >
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Finished Today ({finished.length})
                  </Text>
                  <Text style={[styles.collapseIcon, { color: palette.textLight }]}>
                    {showFinishedToday ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                
                {showFinishedToday && finished.map(task => (
                  <TaskCard key={task.task_id} task={task} section="finished" />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="+"
        label="Create Task"
        onPress={() => setShowCreateTask(true)}
        style={[styles.fab, { backgroundColor: palette.primary }]}
      />

      {/* Drawer Modal */}
      <Modal
        visible={showDrawer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDrawer(false)}
      >
        <SafeAreaView style={[styles.drawer, { backgroundColor: palette.background }]}>
          <View style={[styles.drawerHeader, { borderBottomColor: palette.border }]}>
            <TouchableOpacity onPress={() => setShowDrawer(false)}>
              <Text style={[styles.drawerClose, { color: palette.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.drawerTitle, { color: palette.text }]}>Task Lists</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.drawerTabs}>
            <TouchableOpacity
              style={[
                styles.drawerTab,
                { backgroundColor: drawerTab === 'unscheduled' ? palette.primary : 'transparent' }
              ]}
              onPress={() => setDrawerTab('unscheduled')}
            >
              <Text style={[
                styles.drawerTabText,
                { color: drawerTab === 'unscheduled' ? '#fff' : palette.text }
              ]}>
                Yet to Begin ({unscheduledTasks.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.drawerTab,
                { backgroundColor: drawerTab === 'completed' ? palette.primary : 'transparent' }
              ]}
              onPress={() => setDrawerTab('completed')}
            >
              <Text style={[
                styles.drawerTabText,
                { color: drawerTab === 'completed' ? '#fff' : palette.text }
              ]}>
                Completed ({completedTasks.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerContent}>
            {drawerTab === 'unscheduled' ? (
              unscheduledTasks.map(task => (
                <TaskCard key={task.task_id} task={task} section="unscheduled" />
              ))
            ) : (
              completedTasks.map(task => (
                <TaskCard key={task.task_id} task={task} section="completed" />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTaskDetail(false)}
      >
        {selectedTask && (
          <SafeAreaView style={[styles.taskDetail, { backgroundColor: palette.background }]}>
            <View style={[styles.taskDetailHeader, { borderBottomColor: palette.border }]}>
              <TouchableOpacity onPress={() => setShowTaskDetail(false)}>
                <Text style={[styles.taskDetailClose, { color: palette.text }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.taskDetailTitle, { color: palette.text }]}>Task Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.taskDetailContent}>
              <Text style={[styles.taskDetailName, { color: palette.text }]}>
                {selectedTask.name}
              </Text>
              
              {selectedTask.description && (
                <Text style={[styles.taskDetailDescription, { color: palette.textLight }]}>
                  {selectedTask.description}
                </Text>
              )}

              <View style={styles.taskDetailMeta}>
                <View style={styles.taskDetailMetaRow}>
                  <Text style={[styles.taskDetailMetaLabel, { color: palette.textLight }]}>
                    Class:
                  </Text>
                  <Text style={[styles.taskDetailMetaValue, { color: palette.text }]}>
                    {selectedTask.action_class_name || 'None'}
                  </Text>
                </View>

                <View style={styles.taskDetailMetaRow}>
                  <Text style={[styles.taskDetailMetaLabel, { color: palette.textLight }]}>
                    Priority:
                  </Text>
                  <Text style={[styles.taskDetailMetaValue, { color: palette.text }]}>
                    {getPriorityBadge(selectedTask.priority).text}
                  </Text>
                </View>

                {selectedTask.created_at && (
                  <View style={styles.taskDetailMetaRow}>
                    <Text style={[styles.taskDetailMetaLabel, { color: palette.textLight }]}>
                      Created:
                    </Text>
                    <Text style={[styles.taskDetailMetaValue, { color: palette.text }]}>
                      {new Date(selectedTask.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.taskDetailActions}>
                {!selectedTask.completed && selectedTask.status !== 'done' && (
                  <PrimaryButton
                    title="Mark as Done"
                    onPress={() => handleCompleteTask(selectedTask)}
                    style={[styles.taskDetailButton, { backgroundColor: palette.success }]}
                  />
                )}

                <PrimaryButton
                  title="Edit Task"
                  onPress={() => {
                    setShowTaskDetail(false);
                    // TODO: Implement edit task modal
                  }}
                  style={[styles.taskDetailButton, { backgroundColor: palette.primary }]}
                />

                <PrimaryButton
                  title="Delete Task"
                  onPress={() => handleDeleteTask(selectedTask)}
                  style={[styles.taskDetailButton, { backgroundColor: palette.danger }]}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Create Task Modal */}
      <Modal
        visible={showCreateTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateTask(false)}
      >
        <SafeAreaView style={[styles.createTask, { backgroundColor: palette.background }]}>
          <View style={[styles.createTaskHeader, { borderBottomColor: palette.border }]}>
            <TouchableOpacity onPress={() => setShowCreateTask(false)}>
              <Text style={[styles.createTaskClose, { color: palette.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.createTaskTitle, { color: palette.text }]}>New Task</Text>
            <TouchableOpacity onPress={handleCreateTask}>
              <Text style={[styles.createTaskSave, { color: palette.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.createTaskContent}>
            <Input
              placeholder="Task title *"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              style={styles.createTaskInput}
              maxLength={80}
            />

            <Input
              placeholder="Description (optional)"
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              multiline
              numberOfLines={3}
              style={styles.createTaskInput}
            />

            <Text style={[styles.createTaskLabel, { color: palette.text }]}>Priority</Text>
            <View style={styles.prioritySelector}>
              {[1, 2, 3, 4].map(priority => {
                const badge = getPriorityBadge(priority);
                const isSelected = newTaskPriority === priority;
                return (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityChip,
                      {
                        backgroundColor: isSelected ? palette.primary : palette.surface,
                        borderColor: isSelected ? palette.primary : palette.border,
                        shadowColor: isSelected ? palette.primary : 'transparent',
                      }
                    ]}
                    onPress={() => setNewTaskPriority(priority)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.priorityEmoji}>{badge.emoji}</Text>
                    <Text style={[
                      styles.priorityText,
                      { color: isSelected ? '#fff' : palette.text }
                    ]}>
                      {badge.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.createTaskLabel, { color: palette.text }]}>Dates (Optional)</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: palette.textLight }]}>Start Date</Text>
                <TouchableOpacity 
                  style={[styles.dateInput, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateText, { color: newTaskStartDate ? palette.text : palette.textLight }]}>
                    {newTaskStartDate || 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: palette.textLight }]}>Due Date</Text>
                <TouchableOpacity 
                  style={[styles.dateInput, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Text style={[styles.dateText, { color: newTaskDueDate ? palette.text : palette.textLight }]}>
                    {newTaskDueDate || 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.createTaskLabel, { color: palette.text }]}>Action Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classSelector}>
              {actionClasses.map(cls => (
                <TouchableOpacity
                  key={cls.action_class_id}
                  style={[
                    styles.classButton,
                    {
                      backgroundColor: newTaskActionClass === cls.action_class_id ? cls.color : palette.surface,
                      borderColor: cls.color
                    }
                  ]}
                  onPress={() => setNewTaskActionClass(cls.action_class_id)}
                >
                  <Text style={[
                    styles.classButtonText,
                    { color: newTaskActionClass === cls.action_class_id ? '#fff' : palette.text }
                  ]}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Start Date Picker */}
      <DatePicker
        modal
        open={showStartDatePicker}
        date={newTaskStartDate ? new Date(newTaskStartDate) : new Date()}
        mode="date"
        onConfirm={(date) => {
          setShowStartDatePicker(false);
          setNewTaskStartDate(date.toISOString().slice(0, 10));
        }}
        onCancel={() => {
          setShowStartDatePicker(false);
        }}
      />

      {/* Due Date Picker */}
      <DatePicker
        modal
        open={showDueDatePicker}
        date={newTaskDueDate ? new Date(newTaskDueDate) : new Date()}
        mode="date"
        onConfirm={(date) => {
          setShowDueDatePicker(false);
          setNewTaskDueDate(date.toISOString().slice(0, 10));
        }}
        onCancel={() => {
          setShowDueDatePicker(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerIcon: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapseIcon: {
    fontSize: 14,
  },
  taskCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskAccent: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    padding: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    fontSize: 16,
    marginRight: 8,
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  completeButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  completeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
  },
  drawer: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  drawerClose: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  drawerTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  drawerTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  drawerTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  drawerContent: {
    flex: 1,
    paddingVertical: 8,
  },
  taskDetail: {
    flex: 1,
  },
  taskDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskDetailClose: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  taskDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  taskDetailContent: {
    flex: 1,
    padding: 16,
  },
  taskDetailName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskDetailDescription: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  taskDetailMeta: {
    marginBottom: 32,
  },
  taskDetailMetaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  taskDetailMetaLabel: {
    fontSize: 14,
    width: 80,
  },
  taskDetailMetaValue: {
    fontSize: 14,
    flex: 1,
  },
  taskDetailActions: {
    gap: 12,
  },
  taskDetailButton: {
    marginBottom: 8,
  },
  createTask: {
    flex: 1,
  },
  createTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  createTaskClose: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  createTaskTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createTaskSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  createTaskContent: {
    flex: 1,
    padding: 16,
  },
  createTaskInput: {
    marginBottom: 16,
  },
  createTaskLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  priorityEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  dateInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 14,
  },
  classSelector: {
    marginBottom: 16,
  },
  classButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  classButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TaskScreen;
