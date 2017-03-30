import Bigint from '../tools/bigint';
import Promise from 'bluebird';
import {request} from '../tools/smb2-forge';
import {Writable} from 'stream';

import {
  FILE_OPEN,
} from '../structures/constants';

const requestAsync = Promise.promisify(request);

export default function (path, reread, cb) {
  var connection = this;

  const rereadBig = new Bigint(8, reread);

  // console.log('Opening file');

  return requestAsync('open', {'path': path}, connection)
    .then(function(file) {
      var fileLength = 0;
      for (var i = 0; i < file.EndofFile.length; i++) {
        fileLength += file.EndofFile[i] * Math.pow(2, i * 8);
      }

      const fileLengthBig = new Bigint(8, fileLength);
      const readOffset = fileLengthBig.sub(rereadBig);

      // console.log('Reading file at', readOffset.toNumber(), 'from', fileLengthBig.toNumber(), '( reread:', rereadBig.toNumber(), ')');

      return requestAsync('read', {
          'FileId': file.FileId,
          'Length': reread,
          'Offset': readOffset.toBuffer()
        }, connection)
          .then(function(chunk) {
            const writeOffset = new Bigint(8, 0);

            // console.log('Writing file');

            return requestAsync('write', {
                'FileId': file.FileId,
                'Offset': writeOffset.toBuffer(),
                'Buffer': chunk
              }, connection);
          }).then(function() {
            // console.log('Truncating file');

            return requestAsync('set_info', {
                'FileId': file.FileId,
                'FileInfoClass': 'FileEndOfFileInformation',
                'Buffer': readOffset.toBuffer()
              }, connection);
          }).finally(function() {
            // console.log('Closing file');

            request('close', file, connection, function(err) {
              if (err) {
                console.error('Failed to close SMB file');
              }
            });
          });
    }).then(function() {
      cb();
    }).catch(function(err) {
      cb(err);
    });
}
