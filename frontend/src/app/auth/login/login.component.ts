import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { PizzeriaService } from '../../services/pizzeria.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(PizzeriaService);

  error = false;

  // El botón queda deshabilitado hasta completar los dos campos obligatorios.
  form = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    password: ['', Validators.required]
  });

  // PHP valida la contraseña; Angular guarda la sesión para el guard y redirige al admin.
  ingresar(): void {
    const datos = this.form.getRawValue();
    this.error = false;

    this.service.login(datos.usuario, datos.password).subscribe({
      next: usuario => {
        sessionStorage.setItem('admin-auth', 'true');
        sessionStorage.setItem('admin-user', JSON.stringify(usuario));
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.error = true;
      }
    });
  }
}
