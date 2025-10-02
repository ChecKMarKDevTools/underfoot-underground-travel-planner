import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { DebugPanel } from '../../src/components/DebugPanel';
import { DebugData } from '../../src/types';

describe('DebugPanel', () => {
  const mockDebugData: DebugData = {
    searchQuery: 'ancient temples',
    processingTime: 1500,
    confidence: 0.85,
    keywords: ['ancient', 'temples'],
    geospatialData: {
      boundingBox: [51.6, 51.4, 0.1, -0.3],
      centerPoint: [51.5074, -0.1278],
      searchRadius: 5000,
    },
    llmReasoning: 'Test reasoning',
    dataSource: ['Source 1', 'Source 2'],
  };

  it('should not render when not visible', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/debug console/i)).not.toBeInTheDocument();
  });

  it('should render when visible', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/debug console/i)).toBeInTheDocument();
  });

  it('should show empty state when no debug data', () => {
    render(<DebugPanel debugData={null} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/no debug data/i)).toBeInTheDocument();
  });

  it('should render search query', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText('ancient temples')).toBeInTheDocument();
  });

  it('should render keywords', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText('ancient')).toBeInTheDocument();
    expect(screen.getByText('temples')).toBeInTheDocument();
  });

  it('should render processing time', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/1500\s*ms/)).toBeInTheDocument();
  });

  it('should render confidence percentage', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/85\.0%/)).toBeInTheDocument();
  });

  it('should render center point', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/51\.5074/)).toBeInTheDocument();
    expect(screen.getByText(/-0\.1278/)).toBeInTheDocument();
  });

  it('should render search radius', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
  });

  it('should render LLM reasoning', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Test reasoning')).toBeInTheDocument();
  });

  it('should render data sources', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Source 1')).toBeInTheDocument();
    expect(screen.getByText('Source 2')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <DebugPanel debugData={mockDebugData} isVisible={true} onClose={onClose} />,
    );

    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render bounding box when provided', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/51\.6/)).toBeInTheDocument();
  });

  it('should handle missing geospatial data gracefully', () => {
    const dataWithoutGeo = {
      ...mockDebugData,
      geospatialData: {},
    };
    render(<DebugPanel debugData={dataWithoutGeo} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/debug console/i)).toBeInTheDocument();
  });

  it('should render all section headers', () => {
    render(<DebugPanel debugData={mockDebugData} isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/query analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/geospatial data/i)).toBeInTheDocument();
    expect(screen.getByText(/ai reasoning/i)).toBeInTheDocument();
    expect(screen.getByText(/data sources/i)).toBeInTheDocument();
  });
});
