import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1B2A',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 58,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.whiteDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          title: 'Content',
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="competitions"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => <Ionicons name="flash-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      {/* Hidden sub-screens */}
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="quizzes" options={{ href: null }} />
      <Tabs.Screen name="questions" options={{ href: null }} />
      <Tabs.Screen name="banners-manage" options={{ href: null }} />
      <Tabs.Screen name="rewards-manage" options={{ href: null }} />
      <Tabs.Screen name="entries" options={{ href: null }} />
      <Tabs.Screen name="settings-rules" options={{ href: null }} />
      <Tabs.Screen name="settings-scoring" options={{ href: null }} />
      <Tabs.Screen name="settings-maintenance" options={{ href: null }} />
    </Tabs>
  );
}
