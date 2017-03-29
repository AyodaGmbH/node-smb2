import Bigint from '../tools/bigint';
import Promise from 'bluebird';
import {request} from '../tools/smb2-forge';
import {Writable} from 'stream';

import {
  FILE_OPEN,
} from '../structures/constants';

const requestAsync = Promise.promisify(request);

export default function (path, reread) {
  var connection = this;

  const rereadBig = new Bigint(rereadBig);

  return requestAsync('create', { 'path': path, 'createDisposition': FILE_OPEN }, connection)
    .then(function(file) {
      const readOffset = file.EndofFile.sub(rereadBig);

      return requestAsync('read', {
          'FileId': file.FileId,
          'Length': reread,
          'Offset': readOffset.toBuffer()
        }, connection)
          .then(function(chunk) {
            const writeOffset = new Bigint(0);

            return requestAsync('write', {
                'FileId': file.FileId,
                'Offset': writeOffset.toBuffer(),
                'Buffer': chunk
              }, connection);
          }).then(function() {
            return requestAsync('set_info', {
                'FileId': file.FileId,
                'FileInfoClass': 'FileEndOfFileInformation',
                'Buffer': readOffset.toBuffer()
              }, connection);
          }).finally(function() {
            return requestAsync('close', file, connection);
          });
    });
}
