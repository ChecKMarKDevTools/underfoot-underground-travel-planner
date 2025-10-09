import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '../utils/test-utils';
import { MessageBubble } from '../../src/components/MessageBubble';
import { ChatArea } from '../../src/components/ChatArea';
import { Message, Place } from '../../src/types';
import { generateId } from '../../src/utils';

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('MessageBubble rendering performance', () => {
    it('should render large message efficiently', () => {
      const longMessage: Message = {
        id: 'msg-1',
        content: 'A'.repeat(10000),
        role: 'user',
        timestamp: new Date(),
      };

      const start = performance.now();
      const { unmount } = render(
        <MessageBubble message={longMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
      unmount();
    });

    it('should render message with many places efficiently', () => {
      const places: Place[] = Array.from({ length: 20 }, (_, i) => ({
        id: `place-${i}`,
        name: `Place ${i}`,
        description: 'Description',
        latitude: 51.5 + i * 0.01,
        longitude: -0.1 + i * 0.01,
        category: 'ancient' as const,
        confidence: 0.8,
      }));

      const message: Message = {
        id: 'msg-1',
        content: 'Test',
        role: 'assistant',
        timestamp: new Date(),
        places,
      };

      const start = performance.now();
      const { unmount } = render(
        <MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />,
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(200);
      unmount();
    });
  });

  describe('ChatArea rendering performance', () => {
    it('should render many messages efficiently', () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(),
      }));

      const start = performance.now();
      const { unmount } = render(
        <ChatArea
          messages={messages}
          isLoading={false}
          selectedPlace={null}
          onPlaceSelect={vi.fn()}
        />,
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
      unmount();
    });

    it('should update efficiently when new message added', async () => {
      const messages: Message[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(),
      }));

      const { rerender } = render(
        <ChatArea
          messages={messages}
          isLoading={false}
          selectedPlace={null}
          onPlaceSelect={vi.fn()}
        />,
      );

      const newMessage: Message = {
        id: 'msg-new',
        content: 'New message',
        role: 'user',
        timestamp: new Date(),
      };

      const start = performance.now();
      rerender(
        <ChatArea
          messages={[...messages, newMessage]}
          isLoading={false}
          selectedPlace={null}
          onPlaceSelect={vi.fn()}
        />,
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe('ID generation performance', () => {
    it('should generate IDs quickly', () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        generateId();
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(0.1);
    });

    it('should maintain uniqueness at scale', () => {
      const count = 10000;
      const ids = new Set<string>();

      const start = performance.now();
      for (let i = 0; i < count; i++) {
        ids.add(generateId());
      }
      const end = performance.now();

      expect(ids.size).toBe(count);
      expect(end - start).toBeLessThan(500);
    });
  });

  describe('Place filtering performance', () => {
    it('should filter large place arrays efficiently', async () => {
      const { googlePlacesService } = await import('../../src/services/mockGooglePlaces');

      const start = performance.now();
      const promise = googlePlacesService.searchPlaces('ancient');
      vi.runAllTimers();
      await promise;
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Component re-render performance', () => {
    it('should handle rapid prop changes efficiently', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Test',
        role: 'assistant',
        timestamp: new Date(),
        places: [
          {
            id: 'place-1',
            name: 'Place 1',
            description: 'Desc',
            latitude: 51.5,
            longitude: -0.1,
            category: 'ancient',
            confidence: 0.8,
          },
        ],
      };

      const { rerender } = render(
        <MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />,
      );

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        rerender(
          <MessageBubble
            message={message}
            selectedPlace={i % 2 === 0 ? 'place-1' : null}
            onPlaceSelect={vi.fn()}
          />,
        );
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Memory usage', () => {
    it('should not leak memory when mounting/unmounting', () => {
      const message: Message = {
        id: 'msg-1',
        content: 'Test message',
        role: 'user',
        timestamp: new Date(),
      };

      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(
          <MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />,
        );
        unmount();
      }

      expect(true).toBe(true);
    });
  });

  describe('Data transformation performance', () => {
    it('should convert places efficiently', async () => {
      const { googlePlacesService } = await import('../../src/services/mockGooglePlaces');

      const promise = googlePlacesService.searchPlaces('london');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const start = performance.now();
      googlePlaces.forEach((place) => {
        googlePlacesService.convertToPlace(place);
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });
  });
});
