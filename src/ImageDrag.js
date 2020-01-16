import React from 'react';
import range from 'lodash/range';
import { Motion, spring } from 'react-motion';

import './ImageDrag.css';

const dataStructure = [ // structure that models our initial rendered view of items
  [0, 1, 4],
  [3],
  [2]
]

const pictures = [
  "https://s3-ap-southeast-2.amazonaws.com/images.getjarvis.com.au/9068b2bd089c037a144fc847b9967ee83dce0fe5299261a884adc3241a33604b.jpeg",
  "https://s3-ap-southeast-2.amazonaws.com/images.getjarvis.com.au/9068b2bd089c037a144fc847b9967ee83dce0fe5299261a884adc3241a33604b.jpeg",
  "https://s3-ap-southeast-2.amazonaws.com/images.getjarvis.com.au/9068b2bd089c037a144fc847b9967ee83dce0fe5299261a884adc3241a33604b.jpeg",
  "https://s3-ap-southeast-2.amazonaws.com/images.getjarvis.com.au/9068b2bd089c037a144fc847b9967ee83dce0fe5299261a884adc3241a33604b.jpeg",
  "https://s3-ap-southeast-2.amazonaws.com/images.getjarvis.com.au/9068b2bd089c037a144fc847b9967ee83dce0fe5299261a884adc3241a33604b.jpeg"
];

const reinsert = (array, colFrom, rowFrom, colTo, rowTo) => {
  const _array = array.slice(0);
  const val = _array[colFrom][rowFrom];
  _array[colFrom].splice(rowFrom, 1);
  _array[colTo].splice(rowTo, 0, val);
  calculateVisiblePositions(_array);
  return _array;
}

const gutterPadding = 21;
const clamp = (n, min, max) => Math.max(Math.min(n, max), min);
const getColumnWidth = () => (window.innerWidth / dataStructure.length) - (gutterPadding / dataStructure.length); // spread columns over available window width
const height = 220; // crappy fixed item height :(

let width = getColumnWidth(),
  layout = null;

// items are ordered by their index in this visual positions array
const calculateVisiblePositions = (newOrder) => {
  width = getColumnWidth();
  layout = newOrder.map((column, col) => {
      return range(column.length + 1).map((item, row) => {
        return [width * col, height * row];
    });
 });
}

// define spring motion opts
const springSetting1 = {stiffness: 180, damping: 10};
const springSetting2 = {stiffness: 150, damping: 16};

class ImageDrag extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mouse: [0, 0],
      delta: [0, 0], // difference between mouse and item position, for dragging
      lastPress: null, // key of the last pressed component
      currentColumn: null,
      isPressed: false,
      order: dataStructure, // index: visual position. value: component key/id
      isResizing: false
    };
  }

  componentWillMount() {
    this.resizeTimeout = null;
    calculateVisiblePositions(dataStructure);
  }

  componentDidMount() {
    window.addEventListener('touchmove', this.handleTouchMove);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchend', this.handleMouseUp);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleTouchStart = (key, currentColumn, pressLocation, e) => {
    this.handleMouseDown(key, currentColumn, pressLocation, e.touches[0]);
  }

  handleTouchMove = (e) => {
    e.preventDefault();
    this.handleMouseMove(e.touches[0]);
  };

  handleMouseMove = ({pageX, pageY}) => {
    const {order, lastPress, currentColumn: colFrom, isPressed, delta: [dx, dy]} = this.state;
    if (isPressed) {
      const mouse = [pageX - dx, pageY - dy];
      const colTo = clamp(Math.floor((mouse[0] + (width / 2)) / width), 0, 2);
      const rowTo = clamp(Math.floor((mouse[1] + (height / 2)) / height), 0, 100);
      const rowFrom = order[colFrom].indexOf(lastPress);
      const newOrder = reinsert(order, colFrom, rowFrom, colTo, rowTo);
      this.setState({
        mouse,
        order: newOrder,
        currentColumn: colTo
      });
    }
  };

  handleMouseDown = (key, currentColumn, [pressX, pressY], {pageX, pageY}) => {
    this.setState({
      lastPress: key,
      currentColumn,
      isPressed: true,
      delta: [pageX - pressX, pageY - pressY],
      mouse: [pressX, pressY],
    });
  };

  handleMouseUp = () => {
    this.setState({
      isPressed: false,
      delta: [0, 0]
    });
  };

  handleResize = () => {
    clearTimeout(this.resizeTimeout);
    this.applyResizingState(true);
    // resize one last time after resizing stops, as sometimes this can be a little janky sometimes...
    this.resizeTimeout = setTimeout(() => this.applyResizingState(false), 100);
  }

  applyResizingState = (isResizing) => {
    this.setState({ isResizing });
    calculateVisiblePositions(dataStructure);
  }

  render() {
    const { order, lastPress, currentColumn, isPressed, mouse, isResizing } = this.state;
    return (
      <div className="items">
        {order.map((column, colIndex) => {
          return (
            column.map((row) => {
              let style,
                x,
                y,
                visualPosition = order[colIndex].indexOf(row),
                isActive = (row === lastPress && colIndex === currentColumn && isPressed);

              if(isActive) {
                [x, y] = mouse;
                style = {
                  translateX: x,
                  translateY: y,
                  scale: spring(1.1, springSetting1)
                };
              } else if(isResizing) {
                [x, y] = layout[colIndex][visualPosition];
                style = {
                  translateX: x,
                  translateY: y,
                  scale: 1
                };
              } else {
                [x, y] = layout[colIndex][visualPosition];
                style = {
                  translateX: spring(x, springSetting2),
                  translateY: spring(y, springSetting2),
                  scale: spring(1, springSetting1)
                };
              }

              return (
                <Motion key={row} style={style}>
                  {({translateX, translateY, scale}) =>
                  <div
                    onMouseDown={this.handleMouseDown.bind(null, row, colIndex, [x, y])}
                    onTouchStart={this.handleTouchStart.bind(null, row, colIndex, [x, y])}
                    className={isActive ? 'item active-item' : 'item'}
                    style={{
                      WebkitTransform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                      transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                      zIndex: (row === lastPress && colIndex === currentColumn) ? 99 : visualPosition,
                    }}><img src={pictures[row]} alt={row}/></div>
                  }
                </Motion>
              )
            })
          )
        })}
      </div>
    );
  }
}

export default ImageDrag;