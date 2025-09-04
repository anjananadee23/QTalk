import { useRouter } from "expo-router";
import React from "react";
import { FlatList, View } from "react-native";
import ChatItem from './ChatItem';

export default function ChatList({ users, currentUser }) {
    const router = useRouter();
    return (
        <View className="flex-1" style={{ backgroundColor: '#f8f9fa' }}>
            <FlatList
                data={users}
                contentContainerStyle={{ 
                    paddingTop: 12, 
                    paddingBottom: 20,
                    paddingHorizontal: 4
                }}
                keyExtractor={item => Math.random()}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => (
                    <View style={{ height: 8 }} />
                )}
                renderItem={({ item, index }) => <ChatItem
                    noBorder={index + 1 === users.length}
                    router={router}
                    currentUser={currentUser}
                    item={item}
                    index={index}
                />}
            />
        </View>
    )
}