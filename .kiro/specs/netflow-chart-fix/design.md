# Design Document

## Overview

The NetFlowChart component bug is caused by a mismatch between data processing logic and ECharts rendering expectations. While the component successfully fetches and processes data, the chart fails to render due to several potential issues:

1. **Data Array Length Mismatch**: The logs show timestamps (499) vs prices (498) length difference
2. **ECharts Configuration Issues**: The chart configuration may not properly handle the processed data format
3. **Rendering State Management**: The component may not properly manage the chart rendering lifecycle
4. **Data Validation Gaps**: Missing validation for edge cases in data processing

## Architecture

The fix will follow a layered approach:

```
┌─────────────────────────────────────┐
│           NetFlowChart              │
├─────────────────────────────────────┤
│  Data Validation & Processing Layer │
├─────────────────────────────────────┤
│     ECharts Configuration Layer     │
├─────────────────────────────────────┤
│       Chart Rendering Layer        │
├─────────────────────────────────────┤
│      Error Handling Layer          │
└─────────────────────────────────────┘
```

## Components and Interfaces

### 1. Data Validation Module
- **Purpose**: Ensure data integrity before processing
- **Interface**: `validateNetFlowData(data) -> { isValid: boolean, errors: string[] }`
- **Responsibilities**:
  - Check array lengths consistency
  - Validate data types and ranges
  - Handle null/undefined values

### 2. Data Processing Module
- **Purpose**: Transform API data into chart-ready format
- **Interface**: `processNetFlowData(rawData, options) -> ChartData`
- **Responsibilities**:
  - Normalize array lengths
  - Calculate derived values (net flow)
  - Apply time range filtering
  - Format data for ECharts

### 3. Chart Configuration Module
- **Purpose**: Generate ECharts configuration
- **Interface**: `generateChartConfig(processedData, displayOptions) -> EChartsOption`
- **Responsibilities**:
  - Create series configurations
  - Set up axes and scaling
  - Configure tooltips and legends
  - Handle responsive design

### 4. Rendering State Manager
- **Purpose**: Manage chart lifecycle and updates
- **Interface**: `ChartStateManager`
- **Responsibilities**:
  - Track rendering state
  - Handle update conflicts
  - Manage chart instance lifecycle
  - Coordinate data updates

## Data Models

### NetFlowData Interface
```typescript
interface NetFlowData {
  baseCoin: string;
  exchangeName: string;
  interval: string;
  timestamps: number[];
  longRatios: number[];
  shortRatios: number[];
  prices: number[];
}
```

### ProcessedChartData Interface
```typescript
interface ProcessedChartData {
  timestamps: number[];
  buyFlows: number[];
  sellFlows: number[];
  netFlows: number[];
  prices: number[];
  metadata: {
    dataPoints: number;
    timeRange: [number, number];
    priceRange: [number, number];
  };
}
```

### ChartRenderState Interface
```typescript
interface ChartRenderState {
  isInitialized: boolean;
  isUpdating: boolean;
  lastUpdateTime: number;
  hasValidData: boolean;
  errorState?: string;
}
```

## Error Handling

### Error Categories
1. **Data Validation Errors**: Invalid or inconsistent data from API
2. **Processing Errors**: Issues during data transformation
3. **Rendering Errors**: ECharts-specific rendering failures
4. **State Management Errors**: Conflicts in update lifecycle

### Error Recovery Strategy
- **Graceful Degradation**: Show partial data when possible
- **User Feedback**: Clear error messages for user-facing issues
- **Retry Logic**: Automatic retry for transient failures
- **Fallback Display**: Show "loading" instead of "no data" during processing

## Testing Strategy

### Unit Tests
- Data validation functions
- Data processing logic
- Chart configuration generation
- Error handling scenarios

### Integration Tests
- End-to-end data flow from API to chart
- Chart rendering with various data scenarios
- Error recovery workflows
- Performance with large datasets

### Visual Regression Tests
- Chart appearance consistency
- Responsive behavior
- Animation and transition quality

## Implementation Approach

### Phase 1: Data Validation Enhancement
- Add comprehensive data validation
- Implement array length normalization
- Add detailed error logging

### Phase 2: Chart Configuration Fix
- Review and fix ECharts configuration
- Ensure proper series data mapping
- Optimize rendering performance

### Phase 3: State Management Improvement
- Implement proper rendering state tracking
- Add conflict resolution for rapid updates
- Improve error state handling

### Phase 4: Testing and Validation
- Add comprehensive test coverage
- Perform cross-browser testing
- Validate with various token data