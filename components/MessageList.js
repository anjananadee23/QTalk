import { ScrollView } from 'react-native';
import MessageItem from './MessageItem';

export default function MessageList({ messages, scrollViewRef, currentUser }) {
  return (
    <ScrollView 
      ref={scrollViewRef} 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ 
        paddingTop: 16, 
        paddingBottom: 20,
        flexGrow: 1 
      }}
      style={{
        backgroundColor: '#f7f8fc'
      }}
    >
      {
        messages.map((message, index) => {
          return (
            <MessageItem message={message} key={index} currentUser={currentUser} />
          )
        })
      }
    </ScrollView>
  )
}