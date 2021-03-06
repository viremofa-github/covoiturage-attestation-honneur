import { saveAs } from 'file-saver';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { from, ObservableInput } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ProfilePublicFormInterface } from '../shared/interfaces/ProfilePublicForm.interface';
import { certFilename } from '../shared/helpers/certFilename.helper';

@Injectable({
  providedIn: 'root',
})
export class PdfPublicGeneratorService {
  constructor(private http: HttpClient) {}

  generate(data: ProfilePublicFormInterface) {
    this.http
      .get('/assets/certificate_public.pdf', { responseType: 'arraybuffer' })
      .pipe(
        catchError(this.handleError),

        // convert the PDF load document to an observable
        switchMap((pdfBuffer: ArrayBuffer) =>
          from(PDFDocument.load(pdfBuffer))
        ),

        // embed the font (Promise) and draw all text boxes
        // doc.save returns a Promise with a ArrayBuffer
        switchMap(async (doc: PDFDocument) => {
          const font = await doc.embedFont(StandardFonts.HelveticaBold);
          const page = doc.getPage(0);
          const draw = ((p, f) => (text, x, y, size = 11) => {
            p.drawText(text, {
              x,
              y,
              size,
              font: f,
              color: rgb(0, 0, 0),
            });
          })(page, font);

          draw(data.name, 420, 494);
          draw(data.days.toString(), 457, 298);
          draw(data.year.toString(), 568, 298);
          draw(data.location, 380, 193);

          const now = new Date();
          draw(
            `${now.getDate()}/${now.getMonth()}/${now.getFullYear()}`,
            380,
            180
          );

          draw(data.name, 79, 482, 10);
          page.drawText(data.ministry, {
            font,
            x: 79,
            y: 456,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: 256,
            lineHeight: 13,
          });
          draw(data.rank, 79, 417, 10);

          page.drawText(data.home_address, {
            font,
            x: 79,
            y: 391,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: 256,
            lineHeight: 13,
          });

          page.drawText(data.work_address, {
            font,
            x: 79,
            y: 352,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: 256,
            lineHeight: 13,
          });

          // yes / no check
          if (data.mobility !== 'no') {
            draw('x', 94, 286);
            draw(data.mobility_date, 230, 286, 10);
          } else draw('x', 94, 273);

          // set metadata
          doc.setTitle("Attestation sur l'honneur de covoiturage");
          doc.setSubject("Attestation sur l'honneur de covoiturage");
          doc.setKeywords(['attestation', 'covoiturage']);
          doc.setProducer('beta.gouv');
          doc.setCreator('');
          doc.setAuthor('Ministère de la Transition écologique');

          return doc.save();
        })
      )
      .subscribe((pdfBytes) => {
        saveAs(new Blob([pdfBytes]), certFilename(data.name));
      });
  }

  private handleError(err): ObservableInput<any> {
    console.log(err);
    return err;
  }
}
